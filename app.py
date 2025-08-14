import os
from uuid import uuid4
from datetime import datetime
from flask import Flask, render_template, request, redirect, url_for, flash, jsonify, Response
from flask_sqlalchemy import SQLAlchemy
from flask_login import LoginManager, UserMixin, login_user, login_required, current_user, logout_user
from werkzeug.security import generate_password_hash, check_password_hash
from werkzeug.utils import secure_filename
from sqlalchemy import func

BASE_DIR = os.path.abspath(os.path.dirname(__file__))
DB_PATH = os.environ.get("DATABASE_PATH", os.path.join(BASE_DIR, "app.db"))

app = Flask(__name__)
app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY', 'dev-secret-change-me')
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///' + DB_PATH
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['UPLOAD_FOLDER'] = os.path.join(BASE_DIR, "static", "uploads")
app.config['MAX_CONTENT_LENGTH'] = 5 * 1024 * 1024
os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)

db = SQLAlchemy(app)
login_manager = LoginManager(app)
login_manager.login_view = 'login'

WEASYPRINT_AVAILABLE = False
try:
    from weasyprint import HTML
    WEASYPRINT_AVAILABLE = True
except Exception:
    WEASYPRINT_AVAILABLE = False

PDFKIT_AVAILABLE = False
pdfkit = None
pdfkit_config = None
try:
    import pdfkit
    PDFKIT_AVAILABLE = True
    wkhtml_cmd = os.environ.get("WKHTMLTOPDF_CMD")
    if wkhtml_cmd and os.path.exists(wkhtml_cmd):
        pdfkit_config = pdfkit.configuration(wkhtmltopdf=wkhtml_cmd)
except Exception:
    PDFKIT_AVAILABLE = False


class User(UserMixin, db.Model):
    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(255), unique=True, nullable=False)
    username = db.Column(db.String(64), unique=True, nullable=False)
    password_hash = db.Column(db.String(255), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    portfolios = db.relationship('Portfolio', backref='owner', lazy=True)

    def set_password(self, pw): self.password_hash = generate_password_hash(pw)
    def check_password(self, pw): return check_password_hash(self.password_hash, pw)


class Portfolio(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    slug = db.Column(db.String(80), unique=True, nullable=False)
    title = db.Column(db.String(120), default='My Portfolio')
    theme_color = db.Column(db.String(16), default='#38F2AF')
    theme_bg = db.Column(db.String(16), default='#2B2C34')
    locale = db.Column(db.String(8), default='pl')
    data_json = db.Column(db.JSON, default=dict)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


@login_manager.user_loader
def load_user(user_id):
    return db.session.get(User, int(user_id))


def default_portfolio_data():
    return {
        "profile": {
            "first_name": "Your",
            "last_name": "Name",
            "full_name": "YOUR NAME",
            "age": 20,
            "role": "Software Developer",
            "location": "City, Country",
            "phone": "",
            "email": "",
            "avatar_url": "img/avatar.svg",
            "profile_type": "it",
            "contacts": {"github": "", "linkedin": "", "telegram": "", "email": "", "phone": ""},
            "taglines": {"pl": "Krótki opis o Tobie (PL).", "en": "Short tagline about you (EN).", "uk": "Короткий опис про вас (UK)."}
        },
        "stack_groups": [
            {"name": "Languages", "items": ["Python", "JavaScript"], "visible": True},
            {"name": "Frameworks", "items": ["Flask"], "visible": True},
            {"name": "Containers/Serve", "items": ["Docker"], "visible": True},
            {"name": "OS/Admin", "items": ["Linux", "Windows"], "visible": True},
            {"name": "DB", "items": ["SQLite"], "visible": True},
            {"name": "Tools", "items": ["Git"], "visible": True}
        ],
        "skills": [
            {"name": "Python", "level": 80, "label": "Primary"},
            {"name": "JavaScript", "level": 60, "label": "Intermediate"}
        ],
        "spoken_languages": [
            {"name": "English", "level": 70, "label": "B2"},
            {"name": "Polski", "level": 50, "label": "B1"}
        ],
        "projects": [
            {"title": "Project title", "description": "One-liner about the project.", "tags": ["Flask"], "github": "", "live": "", "image": "img/projects/nebula-panel.svg", "status": "in_progress"}
        ],
        "experience": [],
        "education": [],
        "certificates": [],
        "ui": {
            "sections": ["stack", "skills", "spoken", "projects", "experience", "education", "certificates", "about"],
            "color": "#38F2AF",
            "bg": "#2B2C34"
        },
        "domain": "",
        "about_html": "<p>Write something about yourself.</p>"
    }


def normalize_data(data):
    if not isinstance(data, dict):
        data = {}
    data.setdefault("profile", {})
    data.setdefault("projects", [])
    data.setdefault("stack_groups", [])
    data.setdefault("skills", [])
    data.setdefault("spoken_languages", [])
    data.setdefault("experience", [])
    data.setdefault("education", [])
    data.setdefault("certificates", [])
    data.setdefault("about_html", "")
    ui = data.setdefault("ui", {})
    sections = ui.setdefault("sections", [])
    if data.get("certificates") and "certificates" not in sections:
        sections.append("certificates")
    return data


def allowed_file(filename):
    ok = {'png', 'jpg', 'jpeg', 'webp'}
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ok


@app.route('/')
def landing():
    if current_user.is_authenticated:
        return redirect(url_for('dashboard'))
    return render_template('landing.html')


@app.route('/register', methods=['GET', 'POST'])
def register():
    if request.method == 'POST':
        email = request.form.get('email', '').strip().lower()
        username = request.form.get('username', '').strip()
        password = request.form.get('password', '')
        if not email or not username or not password:
            flash('Заполни все поля', 'error')
            return redirect(url_for('register'))
        if User.query.filter(func.lower(User.email) == email).first() or User.query.filter_by(username=username).first():
            flash('Email или username уже заняты', 'error')
            return redirect(url_for('register'))
        u = User(email=email, username=username)
        u.set_password(password)
        db.session.add(u)
        db.session.commit()
        slug = username if not Portfolio.query.filter_by(slug=username).first() else f"{username}-{u.id}"
        p = Portfolio(user_id=u.id, slug=slug, data_json=default_portfolio_data())
        db.session.add(p)
        db.session.commit()
        login_user(u)
        return redirect(url_for('builder', pid=p.id))
    return render_template('auth_register.html')


@app.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'POST':
        email_or_user = request.form.get('email', '').strip()
        password = request.form.get('password', '')
        user = User.query.filter((func.lower(User.email) == email_or_user.lower()) | (User.username == email_or_user)).first()
        if user and user.check_password(password):
            login_user(user)
            return redirect(url_for('dashboard'))
        flash('Неверные данные входа', 'error')
        return redirect(url_for('login'))
    return render_template('auth_login.html')


@app.route('/logout')
@login_required
def logout():
    logout_user()
    return redirect(url_for('landing'))


@app.route('/dashboard')
@login_required
def dashboard():
    portfolios = Portfolio.query.filter_by(user_id=current_user.id).all()
    return render_template('dashboard.html', portfolios=portfolios)


@app.route('/builder/<int:pid>')
@login_required
def builder(pid):
    p = Portfolio.query.filter_by(id=pid, user_id=current_user.id).first_or_404()
    return render_template('builder.html', p=p)


@app.route('/p/<slug>')
def view_portfolio(slug):
    p = Portfolio.query.filter_by(slug=slug).first_or_404()
    data = normalize_data((p.data_json or {}).copy())
    return render_template('portfolio_view.html', p=p, data=data)


@app.route('/api/portfolio/<int:pid>', methods=['GET', 'PATCH', 'DELETE'])
@login_required
def api_portfolio(pid):
    p = Portfolio.query.filter_by(id=pid, user_id=current_user.id).first_or_404()
    if request.method == 'GET':
        data = normalize_data((p.data_json or {}).copy())
        return jsonify({
            "id": p.id,
            "slug": p.slug,
            "title": p.title,
            "theme_color": p.theme_color,
            "theme_bg": p.theme_bg,
            "locale": p.locale,
            "data": data
        })
    if request.method == 'DELETE':
        db.session.delete(p)
        db.session.commit()
        return jsonify({"ok": True})
    payload = request.get_json(silent=True) or {}
    if 'title' in payload:
        p.title = payload['title']
    if 'slug' in payload:
        new_slug = (payload['slug'] or '').strip()
        if new_slug and new_slug != p.slug:
            if Portfolio.query.filter(Portfolio.slug == new_slug, Portfolio.id != p.id).first():
                return jsonify({"error": "Slug already taken"}), 400
            p.slug = new_slug
    if 'theme_color' in payload:
        p.theme_color = payload['theme_color']
    if 'theme_bg' in payload:
        p.theme_bg = payload['theme_bg']
    if 'locale' in payload:
        p.locale = payload['locale']
    if 'data' in payload and isinstance(payload['data'], dict):
        p.data_json = payload['data']
    db.session.commit()
    return jsonify({"ok": True})


@app.route('/api/portfolio', methods=['POST'])
@login_required
def api_create_portfolio():
    payload = request.get_json(silent=True) or {}
    slug = payload.get('slug') or f"{current_user.username}-{int(datetime.utcnow().timestamp())}"
    if Portfolio.query.filter_by(slug=slug).first():
        return jsonify({"error": "Slug already taken"}), 400
    p = Portfolio(
        user_id=current_user.id,
        slug=slug,
        title=payload.get('title', 'My Portfolio'),
        theme_color=payload.get('theme_color', '#38F2AF'),
        theme_bg=payload.get('theme_bg', '#2B2C34'),
        locale=payload.get('locale', 'pl'),
        data_json=payload.get('data') or default_portfolio_data()
    )
    db.session.add(p)
    db.session.commit()
    return jsonify({"id": p.id, "slug": p.slug})


@app.route('/api/upload', methods=['POST'])
@login_required
def api_upload():
    file = request.files.get('file')
    if not file or file.filename == '':
        return jsonify({"error": "no file"}), 400
    if not allowed_file(file.filename):
        return jsonify({"error": "bad file type"}), 400
    filename = secure_filename(file.filename)
    ext = os.path.splitext(filename)[1].lower()
    user_dir = os.path.join(app.config['UPLOAD_FOLDER'], str(current_user.id))
    os.makedirs(user_dir, exist_ok=True)
    new_name = f"{uuid4().hex}{ext}"
    save_path = os.path.join(user_dir, new_name)
    file.save(save_path)
    rel = os.path.relpath(save_path, os.path.join(BASE_DIR, 'static')).replace('\\', '/')
    return jsonify({"path": rel})


@app.route('/api/portfolio/<int:pid>/export/pdf')
@login_required
def export_pdf(pid):
    p = Portfolio.query.filter_by(id=pid, user_id=current_user.id).first_or_404()
    data = normalize_data((p.data_json or {}).copy())
    html = render_template('pdf/cv.html', p=p, data=data, now=datetime.utcnow())
    if WEASYPRINT_AVAILABLE:
        try:
            from weasyprint import HTML
            pdf_bytes = HTML(string=html, base_url=request.url_root).write_pdf()
            filename = f"{p.slug}-cv.pdf"
            return Response(pdf_bytes, mimetype='application/pdf', headers={"Content-Disposition": f"attachment; filename={filename}"})
        except Exception:
            pass
    if PDFKIT_AVAILABLE:
        try:
            options = {
                'enable-local-file-access': None,
                'page-size': 'A4',
                'margin-top': '18mm',
                'margin-right': '16mm',
                'margin-bottom': '18mm',
                'margin-left': '16mm',
                'encoding': 'UTF-8',
                'print-media-type': None,
                'dpi': '144'
            }
            pdf_bytes = pdfkit.from_string(html, False, options=options, configuration=pdfkit_config)
            filename = f"{p.slug}-cv.pdf"
            return Response(pdf_bytes, mimetype='application/pdf', headers={"Content-Disposition": f"attachment; filename={filename}"})
        except Exception as e:
            return jsonify({"error": "PDF generation failed", "detail": str(e)}), 500
    return jsonify({"error": "No PDF backend available. Install WeasyPrint or wkhtmltopdf."}), 500


@app.cli.command('init-db')
def init_db():
    db.create_all()
    print('DB initialized at', DB_PATH)


if __name__ == '__main__':
    with app.app_context():
        db.create_all()
    app.run(debug=True, host='0.0.0.0', port=5000)
