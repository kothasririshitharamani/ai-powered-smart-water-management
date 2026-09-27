from flask import Flask
from flask_cors import CORS
from flask_migrate import Migrate

from app.config import Config
from app.extensions import db, jwt

migrate = Migrate()


def create_app(config_object=Config):
    app = Flask(__name__, instance_relative_config=True)
    app.config.from_object(config_object)
    app.config.from_pyfile("config.py", silent=True)

    db.init_app(app)
    jwt.init_app(app)
    migrate.init_app(app, db)
    CORS(app, resources={r"/api/*": {"origins": app.config["CORS_ORIGINS"]}})

    from app import models  # noqa: F401
    from app.api.auth import auth_bp
    from app.api.profile import profile_bp
    from app.api.water import water_bp

    app.register_blueprint(auth_bp, url_prefix="/api/auth")
    app.register_blueprint(profile_bp, url_prefix="/api/profile")
    app.register_blueprint(water_bp, url_prefix="/api")

    @app.cli.command("init-db")
    def init_db():
        """Create database tables for a new development database."""
        db.create_all()
        print("Database tables initialized.")

    return app