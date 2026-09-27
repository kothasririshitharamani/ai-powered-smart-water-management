"""
Documented agricultural crop water requirement and water-efficiency reference data.
Sources:
- Acharya N.G. Ranga Agricultural University (ANGRAU) Irrigation & Water Management Norms
- Indian Council of Agricultural Research (ICAR) - Water Technology Centre

Decision Support Disclaimer:
This dataset provides decision support guidelines based on research baselines.
Actual water needs and crop outcomes vary based on weather, soil health, and field management.
This does NOT guarantee yield, crop success, or financial income.
"""

DOCUMENTED_SOURCE = (
    "ఆచార్య ఎన్.జి. రంగా వ్యవసాయ విశ్వవిద్యాలయం (ANGRAU) & "
    "భారతీయ వ్యవసాయ పరిశోధనా మండలి (ICAR) నీటి యాజమాన్య ప్రామాణిక వివరాలు"
)

DECISION_SUPPORT_DISCLAIMER = (
    "ఈ సమాచారం కేవలం రైతులకు పంట ఎంపికలో నిర్ణయ మద్దతు కొరకు మాత్రమే. "
    "వాతావరణ పరిస్థితులు, నేల స్వభావం మరియు సాగు పద్ధతులపై ఆధారపడి ఫలితాలు మారవచ్చు. "
    "ఇది దిగుబడికి లేదా ఆదాయానికి ఎటువంటి చట్టపరమైన హామీ కాదు."
)

PADDY_BASELINE_LITERS_PER_ACRE = 1200000.0

CROP_EFFICIENCY_REGISTRY = [
    {
        "crop_key": "millets",
        "crop_name_te": "చిరుధాన్యాలు (జొన్న, రాగి, సజ్జ)",
        "crop_name_en": "Millets (Sorghum, Ragi, Pearl Millet)",
        "water_requirement_liters_per_acre": 300000.0,
        "water_requirement_mm": 300.0,
        "efficiency_category_key": "very_high",
        "efficiency_category_te": "అత్యధిక సామర్థ్యం",
        "water_use_intensity_te": "అత్యల్ప నీటి వినియోగం",
        "water_savings_vs_paddy_percent": 75.0,
        "drought_resilience_te": "అత్యధికం",
        "season_te": "ఖరీఫ్ / రబీ",
        "duration_days": "80 - 105 రోజులు",
        "soil_suitability_te": "తేలికపాటి నేలలు, ఎర్ర నేలలు, చౌడు నేలలు మినహా అన్ని రకాలు",
        "key_benefit_te": "అత్యల్ప నీటితో తక్కువ కాలంలో అధిక పోషక విలువలతో సాగయ్యే పంట.",
    },
    {
        "crop_key": "pulses",
        "crop_name_te": "పప్పుదినుసులు (మినుము, పెసర, కంది)",
        "crop_name_en": "Pulses (Black gram, Green gram, Red gram)",
        "water_requirement_liters_per_acre": 350000.0,
        "water_requirement_mm": 350.0,
        "efficiency_category_key": "very_high",
        "efficiency_category_te": "అత్యధిక సామర్థ్యం",
        "water_use_intensity_te": "అల్ప నీటి వినియోగం",
        "water_savings_vs_paddy_percent": 70.83,
        "drought_resilience_te": "అత్యధికం",
        "season_te": "ఖరీఫ్ / రబీ",
        "duration_days": "65 - 100 రోజులు",
        "soil_suitability_te": "తేలికపాటి నుండి నల్లరేగడి నేలలు, నీరు ఇంకే స్వభావం ఉన్నవి",
        "key_benefit_te": "భూసారాన్ని పెంచుతూ, తక్కువ నీటితో అధిక నికర లాభాలు అందించే పంటలు.",
    },
    {
        "crop_key": "groundnut",
        "crop_name_te": "వేరుశనగ",
        "crop_name_en": "Groundnut / Peanut",
        "water_requirement_liters_per_acre": 450000.0,
        "water_requirement_mm": 450.0,
        "efficiency_category_key": "high",
        "efficiency_category_te": "అధిక సామర్థ్యం",
        "water_use_intensity_te": "మితమైన నీటి వినియోగం",
        "water_savings_vs_paddy_percent": 62.5,
        "drought_resilience_te": "అత్యధికం",
        "season_te": "ఖరీఫ్ / రబీ",
        "duration_days": "105 - 120 రోజులు",
        "soil_suitability_te": "తేలికపాటి ఎర్ర నేలలు, ఇసుక రేగడి నేలలు",
        "key_benefit_te": "వర్షాభావ పరిస్థితుల్లో కూడా మంచి సామర్థ్యంతో తట్టుకోగల నూనెగింజ పంట.",
    },
    {
        "crop_key": "maize",
        "crop_name_te": "మొక్కజొన్న",
        "crop_name_en": "Maize / Corn",
        "water_requirement_liters_per_acre": 500000.0,
        "water_requirement_mm": 500.0,
        "efficiency_category_key": "high",
        "efficiency_category_te": "అధిక సామర్థ్యం",
        "water_use_intensity_te": "మితమైన నీటి వినియోగం",
        "water_savings_vs_paddy_percent": 58.33,
        "drought_resilience_te": "మధ్యస్థం",
        "season_te": "ఖరీఫ్ / రబీ",
        "duration_days": "95 - 110 రోజులు",
        "soil_suitability_te": "లోతైన సారవంతమైన ఒండ్రు నేలలు, ఎర్ర నేలలు",
        "key_benefit_te": "ప్రతి లీటరు నీటికి అత్యధిక బయోమాస్ మరియు గింజ దిగుబడినిచ్చే సమర్థవంతమైన పంట.",
    },
    {
        "crop_key": "cotton",
        "crop_name_te": "పత్తి",
        "crop_name_en": "Cotton",
        "water_requirement_liters_per_acre": 700000.0,
        "water_requirement_mm": 700.0,
        "efficiency_category_key": "moderate",
        "efficiency_category_te": "మధ్యస్థ సామర్థ్యం",
        "water_use_intensity_te": "మధ్యస్థ నీటి వినియోగం",
        "water_savings_vs_paddy_percent": 41.67,
        "drought_resilience_te": "మధ్యస్థం",
        "season_te": "ఖరీఫ్",
        "duration_days": "150 - 170 రోజులు",
        "soil_suitability_te": "లోతైన నల్లరేగడి నేలలు",
        "key_benefit_te": "వాణిజ్య పంట; ఎక్కువ కాలపరిమితి కలిగి ఉండడం వల్ల క్రమబద్ధమైన నీటి యాజమాన్యం అవసరం.",
    },
    {
        "crop_key": "chilli",
        "crop_name_te": "మిరప",
        "crop_name_en": "Chilli",
        "water_requirement_liters_per_acre": 750000.0,
        "water_requirement_mm": 750.0,
        "efficiency_category_key": "moderate",
        "efficiency_category_te": "మధ్యస్థ సామర్థ్యం",
        "water_use_intensity_te": "మధ్యస్థ నీటి వినియోగం",
        "water_savings_vs_paddy_percent": 37.5,
        "drought_resilience_te": "మధ్యస్థం",
        "season_te": "ఖరీఫ్ / రబీ",
        "duration_days": "150 - 180 రోజులు",
        "soil_suitability_te": "నల్లరేగడి, ఎర్ర నేలలు, నీరు ఇంకే సదుపాయం గల నేలలు",
        "key_benefit_te": "అధిక విలువ గల వాణిజ్య పంట; నీటి ఎద్దడి మరియు అధిక తేమ రెండింటికీ సమతుల్యత అవసరం.",
    },
    {
        "crop_key": "rice",
        "crop_name_te": "వరి (వరి ధాన్యం)",
        "crop_name_en": "Rice / Paddy",
        "water_requirement_liters_per_acre": 1200000.0,
        "water_requirement_mm": 1200.0,
        "efficiency_category_key": "low",
        "efficiency_category_te": "తక్కువ సామర్థ్యం",
        "water_use_intensity_te": "అధిక నీటి వినియోగం",
        "water_savings_vs_paddy_percent": 0.0,
        "drought_resilience_te": "సున్నితం",
        "season_te": "ఖరీఫ్ / రబీ",
        "duration_days": "120 - 140 రోజులు",
        "soil_suitability_te": "బంకమట్టి నేలలు, ఒండ్రు నేలలు, నీరు నిల్వ ఉండే నేలలు",
        "key_benefit_te": "ప్రధాన ఆహార పంట; అత్యధిక నీరు అవసరం, నీటి కొరత ప్రాంతాల్లో ఆరుతడి పంటలు ప్రత్యామ్నాయం.",
    },
    {
        "crop_key": "sugarcane",
        "crop_name_te": "చెరకు",
        "crop_name_en": "Sugarcane",
        "water_requirement_liters_per_acre": 1800000.0,
        "water_requirement_mm": 1800.0,
        "efficiency_category_key": "low",
        "efficiency_category_te": "తక్కువ సామర్థ్యం",
        "water_use_intensity_te": "అత్యధిక నీటి వినియోగం",
        "water_savings_vs_paddy_percent": -50.0,
        "drought_resilience_te": "సున్నితం",
        "season_te": "వార్షిక పంట (సంవత్సరం పొడవునా)",
        "duration_days": "300 - 365 రోజులు",
        "soil_suitability_te": "లోతైన సారవంతమైన ఒండ్రు నేలలు, నల్లరేగడి నేలలు",
        "key_benefit_te": "దీర్ఘకాలిక వాణిజ్య పంట; సంవత్సరం పొడవునా సమృద్ధిగా నీటి వనరులు ఉన్న ప్రాంతాలకు మాత్రమే అనుకూలం.",
    },
]

# Lookup map by crop key or name aliases
CROP_LOOKUP = {crop["crop_key"]: crop for crop in CROP_EFFICIENCY_REGISTRY}
# Also allow alias lookup by Telugu / English names
ALIASES = {
    "వరి": "rice",
    "వరి ధాన్యం": "rice",
    "paddy": "rice",
    "rice": "rice",
    "చెరకు": "sugarcane",
    "sugarcane": "sugarcane",
    "మిరప": "chilli",
    "chilli": "chilli",
    "chili": "chilli",
    "పత్తి": "cotton",
    "cotton": "cotton",
    "మొక్కజొన్న": "maize",
    "maize": "maize",
    "corn": "maize",
    "వేరుశనగ": "groundnut",
    "groundnut": "groundnut",
    "peanut": "groundnut",
    "పప్పుదినుసులు": "pulses",
    "pulses": "pulses",
    "చిరుధాన్యాలు": "millets",
    "millets": "millets",
    "జొన్న": "millets",
    "రాగి": "millets",
    "సజ్జ": "millets",
}


def find_crop_by_name(name):
    if not name or not isinstance(name, str):
        return None
    key = name.strip().lower()
    if key in CROP_LOOKUP:
        return CROP_LOOKUP[key]
    if key in ALIASES:
        return CROP_LOOKUP[ALIASES[key]]
    for alias_key, target_key in ALIASES.items():
        if alias_key in key or key in alias_key:
            return CROP_LOOKUP[target_key]
    return None
