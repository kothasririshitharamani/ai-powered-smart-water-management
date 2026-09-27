import re
from decimal import Decimal

from app.extensions import db
from app.models import FarmerProfile, User
from app.services.water_service import budget_summary, usage_history, serialize_usage
from app.services.water_requirement_service import (
    calculate_water_requirement,
    WaterRequirementInputError,
)
from app.services.scarcity_allocation_service import get_scarcity_summary
from app.services.disaster_preparedness_service import get_disaster_preparedness_overview


class VoiceAssistantError(ValueError):
    def __init__(self, message, status=400):
        super().__init__(message)
        self.message = message
        self.status = status


def authenticated_profile():
    from flask_jwt_extended import get_jwt_identity

    user = db.session.get(User, get_jwt_identity())
    if user is None:
        raise VoiceAssistantError("ఖాతా కనుగొనబడలేదు.", 404)
    if user.farmer_profile is None:
        raise VoiceAssistantError("రైతు వివరాలు కనుగొనబడలేదు.", 404)
    return user, user.farmer_profile


def normalize_query(text: str) -> str:
    """Normalize query text by removing punctuation and extra whitespaces."""
    if not text:
        return ""
    cleaned = re.sub(r"[?!.,:;\'\"`~@#$%^&*()_+\-=\[\]{}|<>/]", " ", text)
    return " ".join(cleaned.lower().split())


def classify_intent(query: str) -> str:
    """
    Classifies farmer query into supported intent categories.
    Determined strictly via Telugu domain matching to prevent hallucination.
    """
    q = normalize_query(query)
    if not q:
        return "EMPTY"

    # Help / Greeting
    if any(k in q for k in ["సహాయం", "హలో", "నమస్కారం", "నమస్తే", "ఏమి చేయగలవు", "ఎలా అడగాలి"]):
        return "HELP"

    # Usage Details / History (must be before generic used water check)
    if any(k in q for k in ["వినియోగ వివరాలు", "వినియోగ చరిత్ర", "వినియోగ రికార్డులు", "చివరిగా ఎప్పుడు నీరు", "వాడిన వివరాలు", "వినియోగం చూపించు"]):
        return "USAGE_DETAILS"

    # Remaining Water
    if any(k in q for k in ["మిగిలిన నీరు", "మిగిలి ఉన్న నీరు", "ఇంకా ఎంత నీరు", "ఎంత నీరు మిగిలి"]):
        return "REMAINING_WATER"

    # Used Water / Consumption
    if any(k in q for k in ["ఎంత నీరు ఉపయోగించాను", "వాడిన నీరు", "వినియోగించిన నీరు", "నీటి వినియోగం ఎంత", "ఖర్చు చేసిన నీరు", "ఎంత నీరు వాడాను", "వాడిన నీటి పరిమాణం"]):
        return "USED_WATER"

    # Available Water / Water Budget / Total Water
    if any(k in q for k in ["ఎంత నీరు ఉంది", "దగ్గర ఎంత నీరు", "అందుబాటులో ఉన్న నీరు", "మొత్తం నీరు", "నీటి బడ్జెట్", "వాటర్ బడ్జెట్", "నీరు ఎంత ఉంది"]):
        return "AVAILABLE_WATER"

    # Crop Water Requirement
    if any(k in q for k in ["పంటకు ఎంత నీరు", "పంట నీటి అవసరం", "పంట నీటి అంచనా", "నీటి అవసరం ఎంత", "పంటకు నీరు ఎంత"]):
        return "CROP_REQUIREMENT"

    # Scarcity Allocation
    if any(k in q for k in ["కొరత సమయంలో", "నీటి కేటాయింపు", "కేటాయించిన నీరు", "కేటాయింపు వివరాలు", "పంటలకు ఎంత నీరు కేటాయించాను"]):
        return "SCARCITY_ALLOCATION"

    # Profile / Personal details
    if any(k in q for k in ["నా ప్రొఫైల్", "నా వివరాలు", "నా పేరు", "నా ఫోన్", "నా భూమి"]):
        return "PROFILE_INFO"

    # Disaster Preparedness
    if any(k in q for k in ["వరద", "కరువు", "తుఫాను", "విపత్తు", "భారీ వర్షం వస్తే", "సంసిద్ధత"]):
        return "DISASTER_PREPAREDNESS"

    return "UNSUPPORTED"


def format_number(val) -> str:
    """Formats float/decimal into readable integer or up to 2 decimal places."""
    if val is None:
        return "0"
    num = float(val)
    if num.is_integer():
        return f"{int(num):,}"
    return f"{num:,.2f}".rstrip("0").rstrip(".")


def handle_available_water(profile: FarmerProfile):
    summary = budget_summary(profile)
    avail = summary.get("available_water")
    if avail is None:
        resp = "మీరు ఇంకా నీటి బడ్జెట్‌ను నమోదు చేయలేదు. దయచేసి నీటి నిర్వహణ విభాగంలో మీ అందుబాటులో ఉన్న నీటి బడ్జెట్‌ను నమోదు చేయండి."
    else:
        avail_str = format_number(avail)
        used_str = format_number(summary.get("total_used", 0))
        rem_str = format_number(summary.get("remaining_water", 0))
        resp = f"మీ ఖాతాలో అందుబాటులో ఉన్న మొత్తం నీరు {avail_str} లీటర్లు. మీరు ఇప్పటివరకు {used_str} లీటర్లు ఉపయోగించారు. ప్రస్తుతం {rem_str} లీటర్ల నీరు మిగిలి ఉంది."
    return resp, summary


def handle_used_water(profile: FarmerProfile):
    summary = budget_summary(profile)
    used = summary.get("total_used", 0)
    used_str = format_number(used)
    avail = summary.get("available_water")
    if avail is None:
        resp = f"మీరు ఇప్పటివరకు మొత్తం {used_str} లీటర్ల నీటిని ఉపయోగించారు. కానీ మీ వార్షిక నీటి బడ్జెట్ ఇంకా నమోదు చేయబడలేదు."
    else:
        avail_str = format_number(avail)
        rem_str = format_number(summary.get("remaining_water", 0))
        pct = summary.get("remaining_percent", 0)
        resp = f"మీరు ఇప్పటివరకు మొత్తం {used_str} లీటర్ల నీటిని ఉపయోగించారు. మీ మొత్తం బడ్జెట్ {avail_str} లీటర్లలో ఇంకా {rem_str} లీటర్లు ({pct}%) మిగిలి ఉన్నాయి."
    return resp, summary


def handle_remaining_water(profile: FarmerProfile):
    summary = budget_summary(profile)
    rem = summary.get("remaining_water")
    if rem is None:
        resp = "మీ నీటి బడ్జెట్ ఇంకా నమోదు చేయలేదు. అందువల్ల మిగిలిన నీటి పరిమాణం అందుబాటులో లేదు. దయచేసి నీటి బడ్జెట్‌ను నమోదు చేయండి."
    else:
        rem_str = format_number(rem)
        pct = summary.get("remaining_percent", 0)
        warning_level = summary.get("warning_level", "normal")
        warning_msg = ""
        if warning_level == "very_low":
            warning_msg = " హెచ్చరిక: మీ మిగిలిన నీరు చాలా తక్కువగా ఉంది. దయచేసి పొదుపుగా వినియోగించండి."
        elif warning_level == "low":
            warning_msg = " గమనిక: మీ నీటి నిల్వ 30 శాతం కంటే తక్కువగా ఉంది."
        resp = f"మీ ఖాతాలో ప్రస్తుతం మిగిలి ఉన్న నీరు {rem_str} లీటర్లు ({pct}%).{warning_msg}"
    return resp, summary


def handle_usage_details(profile: FarmerProfile):
    history = usage_history(profile)
    summary = budget_summary(profile)
    total_used_str = format_number(summary.get("total_used", 0))
    if not history:
        resp = "మీ ఖాతాలో ఇప్పటివరకు ఎలాంటి నీటి వినియోగ వివరాలు నమోదు కాలేదు. మొత్తం వాడిన నీరు సున్నా లీటర్లు."
        data = {"usage_count": 0, "total_used": 0, "entries": []}
    else:
        latest = history[0]
        latest_amt = format_number(latest.amount_liters)
        latest_date = latest.recorded_at.strftime("%d-%m-%Y")
        count = len(history)
        resp = f"మీ నీటి వినియోగ వివరాలు: మొత్తం {count} సార్లు నీరు నమోదు చేశారు. చివరిగా {latest_date}న {latest_amt} లీటర్లు నమోదు చేయబడింది. మొత్తం వినియోగం {total_used_str} లీటర్లు."
        data = {
            "usage_count": count,
            "total_used": summary.get("total_used", 0),
            "latest_amount": float(latest.amount_liters),
            "latest_date": latest_date,
            "entries": [serialize_usage(e) for e in history[:5]],
        }
    return resp, data


def handle_crop_requirement(profile: FarmerProfile):
    if not profile.crop or not profile.land_area_acres or profile.land_area_acres <= 0:
        resp = "పంట నీటి అవసరాల అంచనా కోసం దయచేసి మీ ప్రొఫైల్‌లో పంట మరియు భూమి విస్తీర్ణం వివరాలను నమోదు చేయండి."
        return resp, {"crop": profile.crop, "land_area": float(profile.land_area_acres) if profile.land_area_acres else None}

    try:
        estimate = calculate_water_requirement(profile, persist=False)
        est_str = format_number(estimate.get("estimated_liters", 0))
        area_str = format_number(profile.land_area_acres)
        resp = f"మీరు సాగు చేస్తున్న {profile.crop} పంటకు ({area_str} ఎకరాలు, {estimate.get('crop_stage')}), ప్రస్తుత దశలో సుమారు {est_str} లీటర్ల నీరు అవసరం."
        return resp, estimate
    except WaterRequirementInputError as err:
        return err.message, {}


def handle_scarcity_allocation(profile: FarmerProfile):
    summary = get_scarcity_summary(profile)
    plan = summary.get("current_plan")
    if plan and summary.get("total_allocated", 0) > 0:
        alloc_str = format_number(summary.get("total_allocated", 0))
        rem_str = format_number(summary.get("unallocated_water", 0))
        resp = f"మీ ప్రస్తుత నీటి కొరత ప్రణాళికలో పంటలకు మొత్తం {alloc_str} లీటర్ల నీరు కేటాయించబడింది. ఇంకా కేటాయించని మిగిలిన నీరు {rem_str} లీటర్లు."
    else:
        resp = "మీరు ఇంకా నీటి కొరత సమయ కేటాయింపు ప్రణాళికను సృష్టించలేదు. నీటి కొరత విభాగంలో మీ పంటలకు నీటిని సర్దుబాటు చేసుకోవచ్చు."
    return resp, summary


def handle_profile_info(profile: FarmerProfile):
    name = profile.user.name or "రైతు"
    phone = profile.user.mobile or ""
    crop = profile.crop or "నమోదు కాలేదు"
    area = f"{profile.land_area_acres} ఎకరాలు" if profile.land_area_acres else "నమోదు కాలేదు"
    resp = f"మీ ప్రొఫైల్ వివరాలు: పేరు {name}, ఫోన్ నంబర్ {phone}, పంట: {crop}, భూమి: {area}."
    return resp, {
        "name": name,
        "phone": phone,
        "crop": profile.crop,
        "land_area": float(profile.land_area_acres) if profile.land_area_acres else None,
    }


def handle_disaster_preparedness(profile: FarmerProfile, query: str):
    overview = get_disaster_preparedness_overview(profile)
    q = normalize_query(query)
    target_cat = None
    if "వరద" in q:
        target_cat = "flood"
    elif "కరువు" in q:
        target_cat = "drought"
    elif "తుఫాను" in q:
        target_cat = "cyclone"

    if overview["has_active_alerts"]:
        alerts = overview["active_alerts_guidance"]
        if target_cat:
            matching = [a for a in alerts if a["disaster_category"] == target_cat]
            if matching:
                item = matching[0]
                action_text = item["emergency_actions"][0]["action_te"] if item["emergency_actions"] else ""
                resp = f"గమనిక: మీ ప్రాంతానికి సంబంధించి క్రియాశీల {item['category_name_te']} హెచ్చరిక ({item['alert']['title']}) ఉంది. తక్షణ చర్య: {action_text}"
                return resp, overview
        item = alerts[0]
        action_text = item["emergency_actions"][0]["action_te"] if item["emergency_actions"] else ""
        resp = f"గమనిక: మీ ప్రాంతానికి సంబంధించి క్రియాశీల వాతావరణ హెచ్చరిక ({item['alert']['title']}) ఉంది. తక్షణ చర్య: {action_text}"
        return resp, overview
    else:
        if target_cat:
            cat_obj = next((c for c in overview["general_categories"] if c["category_key"] == target_cat), None)
            if cat_obj and cat_obj["general_preparedness"]:
                action_text = cat_obj["general_preparedness"][0]["action_te"]
                resp = f"ప్రస్తుతం మీ ప్రాంతంలో ఎటువంటి క్రియాశీల {cat_obj['category_name_te']} హెచ్చరికలు లేవు. సాధారణ సంసిద్ధత సూచన: {action_text}"
                return resp, overview
        resp = "ప్రస్తుతం మీ ప్రాంతంలో ఎటువంటి క్రియాశీల విపత్తు హెచ్చరికలు లేవు. సాధారణ సంసిద్ధత కోసం మురుగు కాలువలు శుభ్రపరచడం, డ్రిప్ పద్ధతి మరియు పశువుల షెడ్లను పటిష్టపరచడం వంటివి పాటించండి."
        return resp, overview


def handle_help():
    resp = (
        "నమస్కారం! నేను మీ రైతు మిత్ర వాయిస్ అసిస్టెంట్‌ని. "
        "మీరు అందుబాటులో ఉన్న నీరు, వాడిన నీరు, మిగిలిన నీరు లేదా పంట నీటి అవసరాల గురించి అడగవచ్చు. "
        "ఉదాహరణకు: 'నా దగ్గర ఎంత నీరు ఉంది?' లేదా 'నేను ఎంత నీరు ఉపయోగించాను?' అని మాట్లాడండి."
    )
    return resp, {"supported_intents": ["available_water", "used_water", "remaining_water", "usage_details", "crop_requirement", "scarcity_allocation", "disaster_preparedness"]}


def handle_unsupported():
    resp = (
        "క్షమించండి, మీ ప్రశ్న అర్థం కాలేదు. "
        "దయచేసి నీటి నిల్వ, నీటి వినియోగం, మిగిలిన నీరు లేదా పంట వివరాల గురించి అడగండి. "
        "ఉదాహరణకు: 'నా దగ్గర ఎంత నీరు ఉంది?' లేదా 'నా మిగిలిన నీరు ఎంత?'"
    )
    return resp, {}


def process_assistant_query(profile: FarmerProfile, raw_query: str | None, audio_base64: str | None = None):
    """
    Main entry point for voice assistant requests.
    Validates input, classifies intent, retrieves grounded data, and formats Telugu response.
    """
    query = (raw_query or "").strip()

    if not query and not audio_base64:
        raise VoiceAssistantError("దయచేసి ఒక ప్రశ్నను అడగండి లేదా టైప్ చేయండి.", 400)

    if not query and audio_base64:
        # In case only audio was sent without device transcription:
        # Inform the user clearly in Telugu
        raise VoiceAssistantError(
            "వాయిస్ రికగ్నిషన్ ద్వారా ఆడియోను ప్రాసెస్ చేయలేకపోయాము. దయచేసి స్పష్టంగా మాట్లాడండి లేదా టైప్ చేయండి.",
            400,
        )

    intent = classify_intent(query)

    if intent == "AVAILABLE_WATER":
        response_text, data = handle_available_water(profile)
    elif intent == "USED_WATER":
        response_text, data = handle_used_water(profile)
    elif intent == "REMAINING_WATER":
        response_text, data = handle_remaining_water(profile)
    elif intent == "USAGE_DETAILS":
        response_text, data = handle_usage_details(profile)
    elif intent == "CROP_REQUIREMENT":
        response_text, data = handle_crop_requirement(profile)
    elif intent == "SCARCITY_ALLOCATION":
        response_text, data = handle_scarcity_allocation(profile)
    elif intent == "PROFILE_INFO":
        response_text, data = handle_profile_info(profile)
    elif intent == "DISASTER_PREPAREDNESS":
        response_text, data = handle_disaster_preparedness(profile, query)
    elif intent == "HELP":
        response_text, data = handle_help()
    else:
        response_text, data = handle_unsupported()

    return {
        "query": query,
        "intent": intent.lower(),
        "response_text": response_text,
        "data": data,
    }
