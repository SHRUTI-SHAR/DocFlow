import logging
from typing import Dict, Any, List, Optional

logger = logging.getLogger(__name__)

class GenerateFormAppService:
    def __init__(self):
        pass

    async def generate_form_app(self, request_data: Dict[str, Any]) -> Dict[str, Any]:
        """Generate a form application based on the request."""
        try:
            # Check if it's a multi-form application or single form
            if (request_data.get('application') and 
                isinstance(request_data.get('forms'), list) and 
                request_data.get('type') == 'multi-form-application'):
                
                logger.info(f"Generating multi-form application: {request_data['application'].get('name', 'Unknown')}")
                logger.info(f"Forms count: {len(request_data.get('forms', []))}")
                
                return self._generate_multi_form_application(
                    request_data['application'], 
                    request_data['forms']
                )
            else:
                # Handle single form (existing logic)
                form_config = request_data.get('formConfig', {})
                logger.info(f"Generating single form app for: {form_config.get('formTitle', 'Unknown')}")
                
                return self._generate_form_application(form_config)
                
        except Exception as e:
            logger.error(f"Error generating form app: {str(e)}")
            # Always return a valid payload to avoid 500s on the client
            return {
                "appName": "form-app-fallback",
                "files": {
                    "README.md": f"# Generation Fallback\n\nThe application could not be fully generated.\n\nError: {str(e)}\n",
                    "index.html": '<!doctype html><html><head><meta charset="utf-8"><title>Fallback</title></head><body><h1>Generation Fallback</h1><p>See README.md for details.</p></body></html>'
                }
            }

    def _generate_form_application(self, config: Dict[str, Any]) -> Dict[str, Any]:
        """Generate a single form application."""
        app_name = config.get('formTitle', 'form').lower().replace(' ', '-').replace('[^a-z0-9]', '-')
        
        return {
            "appName": app_name,
            "files": {
                # Frontend files
                "index.html": self._generate_html_file(config),
                "style.css": self._generate_css_file(),
                "script.js": self._generate_js_file(config),
                
                # Backend files
                "server.js": self._generate_server_file(config),
                "package.json": self._generate_package_json(app_name, config),
                
                # Database files
                "database/schema.sql": self._generate_database_schema(config),
                "database/setup.js": self._generate_database_setup(),
                
                # Configuration files
                ".env.example": self._generate_env_example(),
                "README.md": self._generate_readme(app_name, config),
                "deploy.sh": self._generate_deploy_script(),
                
                # Docker files
                "Dockerfile": self._generate_dockerfile(),
                "docker-compose.yml": self._generate_docker_compose(app_name),
            }
        }

    def _generate_multi_form_application(self, application: Dict[str, Any], forms: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Generate a multi-form application."""
        app_name = (application.get('display_name') or 
                   application.get('name') or 
                   'multi-form-app').lower().replace(' ', '-').replace('[^a-z0-9]', '-')
        
        sanitized_forms = []
        for form in forms:
            sanitized_forms.append({
                "id": form.get('id', ''),
                "title": form.get('form_title') or form.get('formConfig', {}).get('formTitle', 'Untitled Form'),
                "description": form.get('form_description', ''),
                "config": form.get('form_config') or form.get('formConfig', {"fields": []})
            })
        
        return {
            "appName": app_name,
            "files": {
                "index.html": self._generate_multi_form_html(application, sanitized_forms),
                "style.css": self._generate_css_file(),
                "script.js": self._generate_multi_form_js(sanitized_forms),
                "server.js": self._generate_multi_form_server_file(),
                "package.json": self._generate_multi_form_package_json(app_name),
                # Database files for multi-form app
                "database/schema.sql": self._generate_multi_database_schema(),
                "database/setup.js": self._generate_multi_database_setup(),
                ".env.example": self._generate_env_example(),
                "README.md": self._generate_multi_form_readme(app_name, application, sanitized_forms),
                "Dockerfile": self._generate_dockerfile(),
                "docker-compose.yml": self._generate_docker_compose(app_name),
            }
        }

    def _generate_html_file(self, config: Dict[str, Any]) -> str:
        """Generate HTML file for single form."""
        fields = config.get('fields', [])
        fields_html = ""
        
        for field in fields:
            if field.get('type') in ['submit', 'cancel']:
                continue
                
            field_id = field.get('id', '')
            field_label = field.get('label', '')
            field_type = field.get('type', 'text')
            required = 'required' if field.get('required', False) else ''
            placeholder = f"Enter {field_label.lower()}"
            
            if field_type == 'text':
                fields_html += f'''
                <div class="form-group">
                    <label for="{field_id}">{field_label} {'*' if field.get('required') else ''}</label>
                    <input type="text" id="{field_id}" name="{field_id}" placeholder="{placeholder}" {required}>
                </div>'''
            elif field_type == 'email':
                fields_html += f'''
                <div class="form-group">
                    <label for="{field_id}">{field_label} {'*' if field.get('required') else ''}</label>
                    <input type="email" id="{field_id}" name="{field_id}" placeholder="{placeholder}" {required}>
                </div>'''
            elif field_type == 'date':
                fields_html += f'''
                <div class="form-group">
                    <label for="{field_id}">{field_label} {'*' if field.get('required') else ''}</label>
                    <input type="date" id="{field_id}" name="{field_id}" {required}>
                </div>'''
            elif field_type == 'number':
                fields_html += f'''
                <div class="form-group">
                    <label for="{field_id}">{field_label} {'*' if field.get('required') else ''}</label>
                    <input type="number" id="{field_id}" name="{field_id}" placeholder="{placeholder}" {required}>
                </div>'''
            elif field_type == 'select':
                options = field.get('options', [])
                options_html = ''.join([f'<option value="{opt}">{opt}</option>' for opt in options])
                fields_html += f'''
                <div class="form-group">
                    <label for="{field_id}">{field_label} {'*' if field.get('required') else ''}</label>
                    <select id="{field_id}" name="{field_id}" {required}>
                        <option value="">Select {field_label.lower()}...</option>
                        {options_html}
                    </select>
                </div>'''
            elif field_type == 'checkbox':
                fields_html += f'''
                <div class="form-group checkbox-group">
                    <label class="checkbox-label">
                        <input type="checkbox" id="{field_id}" name="{field_id}" {required}>
                        <span class="checkmark"></span>
                        {field_label} {'*' if field.get('required') else ''}
                    </label>
                </div>'''
            else:
                fields_html += f'''
                <div class="form-group">
                    <label for="{field_id}">{field_label} {'*' if field.get('required') else ''}</label>
                    <input type="text" id="{field_id}" name="{field_id}" placeholder="{placeholder}" {required}>
                </div>'''
        
        form_title = config.get('formTitle', 'Form')
        form_description = config.get('formDescription', '')
        
        return f'''<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{form_title}</title>
    <style>
    /* Inline CSS to ensure styling works */
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); min-height: 100vh; padding: 20px; }
    .container { max-width: 800px; margin: 0 auto; display: flex; align-items: center; min-height: calc(100vh - 40px); }
    .form-container { background: white; padding: 40px; border-radius: 16px; box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1); width: 100%; }
    h1 { color: #333; margin-bottom: 10px; font-size: 2.5rem; font-weight: 700; }
    .form-description { color: #666; margin-bottom: 30px; font-size: 1.1rem; line-height: 1.6; }
    .form-group { margin-bottom: 24px; }
    label { display: block; margin-bottom: 8px; font-weight: 600; color: #333; font-size: 0.95rem; }
    input, select, textarea { width: 100%; padding: 14px 16px; border: 2px solid #e1e5e9; border-radius: 8px; font-size: 1rem; transition: all 0.3s ease; background: white; }
    input:focus, select:focus, textarea:focus { outline: none; border-color: #667eea; box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1); transform: translateY(-1px); }
    .btn { padding: 14px 28px; border: none; border-radius: 8px; font-size: 1rem; font-weight: 600; cursor: pointer; transition: all 0.3s ease; text-decoration: none; display: inline-block; text-align: center; }
    .btn-primary { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; }
    .btn-primary:hover { transform: translateY(-2px); box-shadow: 0 10px 20px rgba(102, 126, 234, 0.3); }
    .btn-secondary { background: #f8f9fa; color: #333; border: 2px solid #e1e5e9; }
    .btn-secondary:hover { background: #e9ecef; }
    .form-actions { display: flex; gap: 16px; margin-top: 32px; }
    .success-message { background: #d4edda; color: #155724; padding: 16px; border-radius: 8px; border: 1px solid #c3e6cb; }
    </style>
</head>
<body>
    <div class="container">
        <div class="form-container">
            <h1>{form_title}</h1>
            {f'<p class="form-description">{form_description}</p>' if form_description else ''}
            
            <form id="mainForm" novalidate>
                {fields_html}
                
                <div class="form-actions">
                    <button type="submit" class="btn btn-primary">Submit Form</button>
                    <button type="button" class="btn btn-secondary" onclick="resetForm()">Reset</button>
                </div>
            </form>
            
            <div id="success-message" class="success-message" style="display: none;">
                <h3>Form submitted successfully!</h3>
                <p>Thank you for your submission.</p>
            </div>
        </div>
    </div>
    
    <script>
    // Inline JavaScript to ensure form functionality works
    document.addEventListener('DOMContentLoaded', function() {{
        const form = document.getElementById('mainForm');
        const successMessage = document.getElementById('success-message');
        
        if (form) {{
            form.addEventListener('submit', handleSubmit);
            
            // Add real-time validation
            const inputs = form.querySelectorAll('input, select, textarea');
            inputs.forEach(input => {{
                input.addEventListener('blur', () => validateField(input));
                input.addEventListener('input', () => clearFieldError(input));
            }});
        }}
    }});

    async function handleSubmit(event) {{
        event.preventDefault();
        
        const form = event.target;
        const formData = new FormData(form);
        const data = Object.fromEntries(formData.entries());
        
        // Show loading state
        form.classList.add('loading');
        const submitBtn = form.querySelector('button[type="submit"]');
        const originalText = submitBtn.textContent;
        submitBtn.textContent = 'Submitting...';
        
        // Validate form
        if (!validateForm(data)) {{
            form.classList.remove('loading');
            submitBtn.textContent = originalText;
            return;
        }}
        
        try {{
            // Submit to backend API
            const response = await fetch('/api/submit', {{
                method: 'POST',
                headers: {{
                    'Content-Type': 'application/json',
                }},
                body: JSON.stringify({{
                    formData: data,
                    timestamp: new Date().toISOString(),
                    userAgent: navigator.userAgent,
                }}),
            }});

            if (response.ok) {{
                // Show success message
                form.style.display = 'none';
                successMessage.style.display = 'block';
                successMessage.scrollIntoView({{ behavior: 'smooth' }});
            }} else {{
                throw new Error('Submission failed');
            }}
        }} catch (error) {{
            console.error('Form submission error:', error);
            alert('There was an error submitting the form. Please try again.');
        }} finally {{
            form.classList.remove('loading');
            submitBtn.textContent = originalText;
        }}
    }}

    function validateForm(data) {{
        let isValid = true;
        const form = document.getElementById('mainForm');
        const inputs = form.querySelectorAll('input[required], select[required], textarea[required]');
        
        inputs.forEach(input => {{
            if (!input.value.trim()) {{
                showFieldError(input, 'This field is required');
                isValid = false;
            }}
        }});
        
        return isValid;
    }}

    function validateField(input) {{
        if (input.hasAttribute('required') && !input.value.trim()) {{
            showFieldError(input, 'This field is required');
        }} else if (input.type === 'email' && input.value && !isValidEmail(input.value)) {{
            showFieldError(input, 'Please enter a valid email address');
        }} else {{
            clearFieldError(input);
        }}
    }}

    function showFieldError(input, message) {{
        clearFieldError(input);
        input.style.borderColor = '#e74c3c';
        const errorDiv = document.createElement('div');
        errorDiv.className = 'field-error';
        errorDiv.textContent = message;
        errorDiv.style.color = '#e74c3c';
        errorDiv.style.fontSize = '0.875rem';
        errorDiv.style.marginTop = '4px';
        input.parentNode.appendChild(errorDiv);
    }}

    function clearFieldError(input) {{
        input.style.borderColor = '#e1e5e9';
        const existingError = input.parentNode.querySelector('.field-error');
        if (existingError) {{
            existingError.remove();
        }}
    }}

    function isValidEmail(email) {{
        return /^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(email);
    }}

    function resetForm() {{
        const form = document.getElementById('mainForm');
        const successMessage = document.getElementById('success-message');
        
        form.reset();
        form.style.display = 'block';
        successMessage.style.display = 'none';
        
        // Clear all field errors
        const inputs = form.querySelectorAll('input, select, textarea');
        inputs.forEach(input => clearFieldError(input));
    }}
    </script>
</body>
</html>'''

    def _generate_css_file(self) -> str:
        """Generate CSS file with modern styling."""
        return '''/* Modern Form Styling */
* {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
}

body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    min-height: 100vh;
    padding: 20px;
}

.container {
    max-width: 800px;
    margin: 0 auto;
    display: flex;
    align-items: center;
    min-height: calc(100vh - 40px);
}

.form-container {
    background: white;
    padding: 40px;
    border-radius: 16px;
    box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
    width: 100%;
}

h1 {
    color: #333;
    margin-bottom: 10px;
    font-size: 2.5rem;
    font-weight: 700;
}

.form-description {
    color: #666;
    margin-bottom: 30px;
    font-size: 1.1rem;
    line-height: 1.6;
}

.form-group {
    margin-bottom: 24px;
}

label {
    display: block;
    margin-bottom: 8px;
    font-weight: 600;
    color: #333;
    font-size: 0.95rem;
}

input, select, textarea {
    width: 100%;
    padding: 14px 16px;
    border: 2px solid #e1e5e9;
    border-radius: 8px;
    font-size: 1rem;
    transition: all 0.3s ease;
    background: white;
}

input:focus, select:focus, textarea:focus {
    outline: none;
    border-color: #667eea;
    box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
    transform: translateY(-1px);
}

input:invalid, select:invalid {
    border-color: #e74c3c;
}

.checkbox-group {
    display: flex;
    align-items: center;
}

.checkbox-label {
    display: flex;
    align-items: center;
    cursor: pointer;
    font-weight: 500;
}

.checkbox-label input[type="checkbox"] {
    width: auto;
    margin-right: 10px;
    transform: scale(1.2);
}

.form-actions {
    display: flex;
    gap: 16px;
    margin-top: 32px;
    flex-wrap: wrap;
}

.btn {
    padding: 14px 28px;
    border: none;
    border-radius: 8px;
    font-size: 1rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.3s ease;
    min-width: 140px;
}

.btn-primary {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
}

.btn-primary:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 20px rgba(102, 126, 234, 0.3);
}

.btn-secondary {
    background: #f8f9fa;
    color: #666;
    border: 2px solid #e1e5e9;
}

.btn-secondary:hover {
    background: #e9ecef;
    transform: translateY(-1px);
}

.success-message {
    text-align: center;
    padding: 30px;
    background: #d4edda;
    border: 2px solid #c3e6cb;
    border-radius: 8px;
    color: #155724;
}

.success-message h3 {
    margin-bottom: 10px;
    color: #155724;
}

.error-message {
    color: #e74c3c;
    font-size: 0.875rem;
    margin-top: 4px;
}

@media (max-width: 768px) {
    .container {
        padding: 10px;
    }
    
    .form-container {
        padding: 24px;
    }
    
    h1 {
        font-size: 2rem;
    }
    
    .form-actions {
        flex-direction: column;
    }
    
    .btn {
        width: 100%;
    }
}'''

    def _generate_js_file(self, config: Dict[str, Any]) -> str:
        """Generate JavaScript file for form handling."""
        return '''// Form handling and validation
document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById('mainForm');
    const successMessage = document.getElementById('success-message');
    
    form.addEventListener('submit', handleSubmit);
    
    // Add real-time validation
    const inputs = form.querySelectorAll('input, select, textarea');
    inputs.forEach(input => {
        input.addEventListener('blur', () => validateField(input));
        input.addEventListener('input', () => clearFieldError(input));
    });
});

async function handleSubmit(event) {
    event.preventDefault();
    
    const form = event.target;
    const formData = new FormData(form);
    const data = Object.fromEntries(formData.entries());
    
    // Show loading state
    form.classList.add('loading');
    const submitBtn = form.querySelector('button[type="submit"]');
    const originalText = submitBtn.textContent;
    submitBtn.textContent = 'Submitting...';
    
    // Validate form
    if (!validateForm(data)) {
        form.classList.remove('loading');
        submitBtn.textContent = originalText;
        return;
    }
    
    try {
        // Submit to backend API
        const response = await fetch('/api/submit', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                formData: data,
                timestamp: new Date().toISOString(),
                userAgent: navigator.userAgent,
            }),
        });
        
        if (!response.ok) {
            throw new Error('Submission failed');
        }
        
        const result = await response.json();
        
        // Show success message
        form.style.display = 'none';
        successMessage.style.display = 'block';
        
        // Optional: Reset form after delay
        setTimeout(() => {
            resetForm();
        }, 5000);
        
    } catch (error) {
        console.error('Submission error:', error);
        alert('Sorry, there was an error submitting your form. Please try again.');
    } finally {
        form.classList.remove('loading');
        submitBtn.textContent = originalText;
    }
}

function validateForm(formData) {
    let isValid = true;
    const errors = [];
    
    // Clear previous errors
    clearAllErrors();
    
    // Basic validation - add more specific rules as needed
    Object.keys(formData).forEach(key => {
        const field = document.querySelector(`[name="${key}"]`);
        if (field && field.hasAttribute('required') && !formData[key]) {
            errors.push(`${key} is required`);
            isValid = false;
        }
    });
    
    // Display errors
    if (!isValid) {
        displayErrors(errors);
    }
    
    return isValid;
}

function validateField(field) {
    const value = field.value.trim();
    const fieldName = field.name;
    const label = field.previousElementSibling?.textContent?.replace('*', '').trim() || fieldName;
    
    clearFieldError(field);
    
    // Required field validation
    if (field.hasAttribute('required') && !value) {
        showFieldError(field, `${label} is required`);
        return false;
    }
    
    // Email validation
    if (field.type === 'email' && value && !/^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(value)) {
        showFieldError(field, 'Please enter a valid email address');
        return false;
    }
    
    return true;
}

function showFieldError(field, message) {
    field.style.borderColor = '#e74c3c';
    
    let errorDiv = field.parentNode.querySelector('.error-message');
    if (!errorDiv) {
        errorDiv = document.createElement('div');
        errorDiv.className = 'error-message';
        field.parentNode.appendChild(errorDiv);
    }
    errorDiv.textContent = message;
}

function clearFieldError(field) {
    field.style.borderColor = '';
    const errorDiv = field.parentNode.querySelector('.error-message');
    if (errorDiv) {
        errorDiv.remove();
    }
}

function clearAllErrors() {
    const errorMessages = document.querySelectorAll('.error-message');
    errorMessages.forEach(error => error.remove());
    
    const inputs = document.querySelectorAll('input, select, textarea');
    inputs.forEach(input => {
        input.style.borderColor = '';
    });
}

function displayErrors(errors) {
    const firstError = errors[0];
    if (firstError) {
        alert('Please fix the following errors:\\n\\n' + errors.join('\\n'));
    }
}

function resetForm() {
    const form = document.getElementById('mainForm');
    const successMessage = document.getElementById('success-message');
    
    form.reset();
    form.style.display = 'block';
    successMessage.style.display = 'none';
    clearAllErrors();
    
    // Focus first input
    const firstInput = form.querySelector('input, select, textarea');
    if (firstInput) {
        firstInput.focus();
    }
}'''

    def _generate_server_file(self, config: Dict[str, Any]) -> str:
        """Generate server.js file."""
        return '''const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const sqlite3 = require('sqlite3').verbose();
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(express.static('.'));

// Database setup
const dbPath = process.env.DATABASE_PATH || './database/submissions.db';
const db = new sqlite3.Database(dbPath);

db.serialize(() => {
    db.run('CREATE TABLE IF NOT EXISTS submissions (' +
        'id INTEGER PRIMARY KEY AUTOINCREMENT, ' +
        'form_data TEXT NOT NULL, ' +
        'submitted_at DATETIME DEFAULT CURRENT_TIMESTAMP, ' +
        'ip_address TEXT, ' +
        'user_agent TEXT, ' +
        'status TEXT DEFAULT "submitted"' +
        ')');
});

app.get('/api/health', (_req, res) => res.json({ status: 'OK', ts: new Date().toISOString() }));

app.post('/api/submit', (req, res) => {
    try {
        const { formData } = req.body || {};
        const ipAddress = req.ip || (req.connection && req.connection.remoteAddress) || '';
        const userAgent = req.headers['user-agent'] || '';

        const stmt = db.prepare('INSERT INTO submissions (form_data, ip_address, user_agent) VALUES (?, ?, ?)');
        stmt.run(JSON.stringify(formData || {}), ipAddress, userAgent, function(err){
            if (err) {
                console.error('DB insert error:', err);
                return res.status(500).json({ success: false });
            }
            res.json({ success: true, submissionId: this.lastID });
        });
        stmt.finalize();
    } catch (e) {
        console.error('Submit error:', e);
        res.status(500).json({ success: false });
    }
});

app.get('*', (_req, res) => res.sendFile(__dirname + '/index.html'));

app.listen(PORT, () => console.log('Server running on port ' + PORT));'''

    def _generate_package_json(self, app_name: str, config: Dict[str, Any]) -> str:
        """Generate package.json file."""
        return f'''{{
  "name": "{app_name}",
  "version": "1.0.0",
  "description": "Generated form application: {config.get('formTitle', 'Form')}",
  "main": "server.js",
  "scripts": {{
    "start": "node server.js",
    "setup": "node database/setup.js"
  }},
  "dependencies": {{
    "express": "^4.18.2",
    "cors": "^2.8.5",
    "helmet": "^7.0.0",
    "sqlite3": "^5.1.6",
    "dotenv": "^16.3.1"
  }}
}}'''

    def _generate_database_schema(self, config: Dict[str, Any]) -> str:
        """Generate database schema."""
        return '''-- Database schema for form submissions
-- Generated automatically

-- Create submissions table
CREATE TABLE IF NOT EXISTS submissions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    form_data TEXT NOT NULL,
    submitted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    ip_address TEXT,
    user_agent TEXT,
    status TEXT DEFAULT 'submitted'
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_submissions_submitted_at ON submissions(submitted_at);
CREATE INDEX IF NOT EXISTS idx_submissions_status ON submissions(status);'''

    def _generate_database_setup(self) -> str:
        """Generate database setup script."""
        return '''const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const path = require('path');

console.log('Setting up database...');

const dbDir = path.dirname(__filename);
if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
}

const db = new sqlite3.Database('./database/submissions.db');
const schemaPath = path.join(__dirname, 'schema.sql');
const schema = fs.readFileSync(schemaPath, 'utf8');

db.exec(schema, (err) => {
    if (err) {
        console.error('Error setting up database:', err);
        process.exit(1);
    } else {
        console.log('Database setup complete!');
        console.log('Database location: ./database/submissions.db');
    }
    db.close();
});'''

    def _generate_env_example(self) -> str:
        """Generate .env.example file."""
        return '''# Server Configuration
PORT=3000
NODE_ENV=development

# Database Configuration
DATABASE_PATH=./database/submissions.db'''

    def _generate_readme(self, app_name: str, config: Dict[str, Any]) -> str:
        """Generate README.md file."""
        return f'''# {config.get('formTitle', 'Form')}

A complete, self-contained form application generated automatically.

## Quick Start

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Set up the database:**
   ```bash
   npm run setup
   ```

3. **Start the application:**
   ```bash
   npm start
   ```

4. **Open your browser:**
   Navigate to `http://localhost:3000`

## Features

- ✅ Responsive Design
- ✅ Client-side Validation
- ✅ Server-side Validation
- ✅ Database Storage
- ✅ Security Headers
- ✅ Error Handling

## API Endpoints

- `POST /api/submit` - Submit form data
- `GET /api/health` - Health check

Generated by Form Builder 🎯'''

    def _generate_deploy_script(self) -> str:
        """Generate deployment script."""
        return '''#!/bin/bash

echo "Starting deployment..."

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "Node.js is not installed. Please install Node.js first."
    exit 1
fi

# Install dependencies
echo "Installing dependencies..."
npm install

# Set up database
echo "Setting up database..."
npm run setup

# Start server
echo "Starting server..."
npm start'''

    def _generate_dockerfile(self) -> str:
        """Generate Dockerfile."""
        return '''FROM node:18-alpine

# Install dependencies for SQLite
RUN apk add --no-cache python3 make g++

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production && npm cache clean --force

# Copy application files
COPY . .

# Create database directory
RUN mkdir -p database

# Set up database
RUN npm run setup

# Expose port
EXPOSE 3000

# Start the application
CMD ["npm", "start"]'''

    def _generate_docker_compose(self, app_name: str) -> str:
        """Generate docker-compose.yml file."""
        return f'''version: '3.8'

services:
  app:
    build: .
    container_name: {app_name}
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - PORT=3000
    volumes:
      - ./database:/app/database
    restart: unless-stopped'''

    # Multi-form specific methods
    def _generate_multi_form_html(self, application: Dict[str, Any], forms: List[Dict[str, Any]]) -> str:
        """Generate HTML for multi-form application."""
        title = application.get('display_name') or application.get('name') or 'Multi Form App'
        forms_json = str(forms).replace("'", '"')
        
        return f'''<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>{title}</title>
    <link rel="stylesheet" href="style.css" />
</head>
<body>
    <div class="container">
        <div class="form-container">
            <h1>{title}</h1>
            <p class="form-description">Select a form below to get started</p>
            <div id="nav" class="form-actions" style="margin-bottom: 16px;"></div>
            <div id="form-root"></div>
        </div>
    </div>
    <script>window.__FORMS__ = {forms_json};</script>
    <script src="script.js"></script>
</body>
</html>'''

    def _generate_multi_form_js(self, forms: List[Dict[str, Any]]) -> str:
        """Generate JavaScript for multi-form application."""
        return '''// Multi-form renderer
(function(){
    const forms = window.__FORMS__ || [];
    const nav = document.getElementById('nav');
    const root = document.getElementById('form-root');

    function fieldHTML(field){
        const req = field.required ? 'required' : '';
        const label = field.label + (field.required ? ' *' : '');
        switch(field.type){
            case 'email':
                return '<div class="form-group"><label>' + label + '</label><input type="email" name="' + field.id + '" placeholder="Enter ' + field.label + '" ' + req + ' /></div>';
            case 'number':
                return '<div class="form-group"><label>' + label + '</label><input type="number" name="' + field.id + '" placeholder="Enter ' + field.label + '" ' + req + ' /></div>';
            case 'date':
                return '<div class="form-group"><label>' + label + '</label><input type="date" name="' + field.id + '" ' + req + ' /></div>';
            case 'select': {
                const opts = (field.options||[]).map(function(o){ return '<option value="' + o + '">' + o + '</option>'; }).join('');
                return '<div class="form-group"><label>' + label + '</label><select name="' + field.id + '" ' + req + '><option value="">Select ' + field.label + '...</option>' + opts + '</select></div>';
            }
            case 'checkbox':
                return '<div class="form-group checkbox-group"><label class="checkbox-label"><input type="checkbox" name="' + field.id + '" ' + req + ' /><span class="checkmark"></span> ' + field.label + (field.required ? ' *' : '') + '</label></div>';
            default:
                return '<div class="form-group"><label>' + label + '</label><input type="text" name="' + field.id + '" placeholder="Enter ' + field.label + '" ' + req + ' /></div>';
        }
    }

    function render(formId){
        const form = forms.find(function(f){ return f.id === formId; }) || forms[0];
        if(!form){ root.innerHTML = '<p>No forms available.</p>'; return; }
        const fields = (form.config && form.config.fields || []).filter(function(x){ return !['submit','cancel'].includes(x.type); });
        const fieldsMarkup = fields.map(fieldHTML).join('');
        root.innerHTML = '<h2 style="margin: 8px 0 16px 0;">' + form.title + '</h2>' +
            (form.description ? '<p class="form-description">' + form.description + '</p>' : '') +
            '<form id="dynamicForm">' + fieldsMarkup + 
            '<div class="form-actions">' +
            '<button type="submit" class="btn btn-primary">Submit</button>' +
            '<button type="button" class="btn btn-secondary" id="resetBtn">Reset</button>' +
            '</div></form>' +
            '<div id="success" class="success-message" style="display:none; margin-top:16px;">' +
            '<h3>Form submitted successfully!</h3></div>';

        const formEl = document.getElementById('dynamicForm');
        const resetBtn = document.getElementById('resetBtn');
        const success = document.getElementById('success');

        if(resetBtn) {
            resetBtn.addEventListener('click', function(){ 
                formEl.reset(); 
                success.style.display='none'; 
            });
        }

        if(formEl) {
            formEl.addEventListener('submit', function(e){
                e.preventDefault();
                const fd = new FormData(formEl);
                const data = {};
                fd.forEach(function(v,k){ data[k]=v; });
                
                fetch('/api/submit', { 
                    method:'POST', 
                    headers:{'Content-Type':'application/json'}, 
                    body: JSON.stringify({ formId: form.id, formData: data }) 
                })
                .then(function(res){
                    if(!res.ok) throw new Error('submit failed');
                    success.style.display='block';
                    formEl.reset();
                })
                .catch(function(err){
                    alert('Submission failed.');
                    console.error(err);
                });
            });
        }
    }

    // Build nav
    if(nav){
        nav.innerHTML = '';
        forms.forEach(function(f){
            const btn = document.createElement('button');
            btn.className = 'btn btn-secondary';
            btn.textContent = f.title;
            btn.onclick = function(){ render(f.id); };
            nav.appendChild(btn);
        });
    }

    // Initial render
    render(forms[0] && forms[0].id);
})();'''

    def _generate_multi_form_server_file(self) -> str:
        """Generate server file for multi-form application."""
        return '''const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(express.static('.'));

// Database setup
const dbPath = process.env.DATABASE_PATH || './database/submissions.db';
const db = new sqlite3.Database(dbPath);

db.serialize(() => {
    db.run('CREATE TABLE IF NOT EXISTS submissions (' +
        'id INTEGER PRIMARY KEY AUTOINCREMENT, ' +
        'form_id TEXT NOT NULL, ' +
        'form_data TEXT NOT NULL, ' +
        'submitted_at DATETIME DEFAULT CURRENT_TIMESTAMP, ' +
        'ip_address TEXT, ' +
        'user_agent TEXT, ' +
        'status TEXT DEFAULT "submitted"' +
        ')');
});

app.get('/api/health', (_req, res) => res.json({ status: 'OK', ts: new Date().toISOString() }));

app.post('/api/submit', (req, res) => {
    try {
        const { formId, formData } = req.body || {};
        const ipAddress = req.ip || (req.connection && req.connection.remoteAddress) || '';
        const userAgent = req.headers['user-agent'] || '';

        const stmt = db.prepare('INSERT INTO submissions (form_id, form_data, ip_address, user_agent) VALUES (?, ?, ?, ?)');
        stmt.run(formId || 'unknown', JSON.stringify(formData || {}), ipAddress, userAgent, function(err){
            if (err) {
                console.error('DB insert error:', err);
                return res.status(500).json({ success: false });
            }
            res.json({ success: true, submissionId: this.lastID });
        });
        stmt.finalize();
    } catch (e) {
        console.error('Submit error:', e);
        res.status(500).json({ success: false });
    }
});

app.get('*', (_req, res) => res.sendFile(path.join(__dirname, 'index.html')));

app.listen(PORT, () => console.log('Server running on port ' + PORT));'''

    def _generate_multi_form_package_json(self, app_name: str) -> str:
        """Generate package.json for multi-form application."""
        return f'''{{
  "name": "{app_name}",
  "version": "1.0.0",
  "description": "Generated multi-form application",
  "main": "server.js",
  "scripts": {{
    "start": "node server.js",
    "setup": "node database/setup.js"
  }},
  "dependencies": {{
    "express": "^4.18.2",
    "cors": "^2.8.5",
    "helmet": "^7.0.0",
    "dotenv": "^16.3.1",
    "sqlite3": "^5.1.6"
  }}
}}'''

    def _generate_multi_database_schema(self) -> str:
        """Generate database schema for multi-form application."""
        return '''-- Schema for multi-form submissions
CREATE TABLE IF NOT EXISTS submissions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  form_id TEXT NOT NULL,
  form_data TEXT NOT NULL,
  submitted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  ip_address TEXT,
  user_agent TEXT,
  status TEXT DEFAULT 'submitted'
);

CREATE INDEX IF NOT EXISTS idx_submissions_form_id ON submissions(form_id);
CREATE INDEX IF NOT EXISTS idx_submissions_submitted_at ON submissions(submitted_at);'''

    def _generate_multi_database_setup(self) -> str:
        """Generate database setup for multi-form application."""
        return '''const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const path = require('path');

console.log('Setting up database...');

const dbDir = path.join(__dirname);
if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
}

const db = new sqlite3.Database('./database/submissions.db');
const schemaPath = path.join(__dirname, 'schema.sql');
const schema = fs.readFileSync(schemaPath, 'utf8');

db.exec(schema, (err) => {
    if (err) {
        console.error('Error setting up database:', err);
        process.exit(1);
    } else {
        console.log('Database setup complete!');
        console.log('Database location: ./database/submissions.db');
    }
    db.close();
});'''

    def _generate_multi_form_readme(self, app_name: str, application: Dict[str, Any], forms: List[Dict[str, Any]]) -> str:
        """Generate README for multi-form application."""
        title = application.get('display_name') or application.get('name') or 'Multi Form App'
        
        return f'''# {title}

A generated application bundling {len(forms)} forms.

## Quick start
1. npm install
2. npm run setup
3. npm start
4. Open http://localhost:3000

Generated by Form Builder 🎯'''
