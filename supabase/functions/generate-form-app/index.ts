import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface FormField {
  id: string;
  label: string;
  type: string;
  required: boolean;
  options?: string[];
  validation?: any;
}

interface FormConfig {
  formTitle: string;
  formDescription?: string;
  fields: FormField[];
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();

    // Check if it's a multi-form application or single form
    if (body && body.application && Array.isArray(body.forms) && body.type === 'multi-form-application') {
      try {
        console.log('Generating multi-form application:', body.application?.name || body.application?.display_name);
        console.log('Forms count:', body.forms?.length || 0);
        const appPackage = generateMultiFormApplication(body.application, body.forms);
        return new Response(JSON.stringify(appPackage), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        });
      } catch (e) {
        console.error('Multi-form generation error:', e);
        const fallback = {
          appName: (body.application?.name || 'form-app') + '-fallback',
          files: {
            'README.md': `# Generation Fallback\n\nThe application could not be fully generated.\n\nError: ${String(e?.message || e)}\n`,
          },
        };
        return new Response(JSON.stringify(fallback), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        });
      }
    } else {
      // Handle single form (existing logic)
      const { formConfig }: { formConfig: FormConfig } = body;
      console.log('Generating single form app for:', formConfig?.formTitle);
      const appPackage = generateFormApplication(formConfig || { formTitle: 'Form', fields: [] });
      return new Response(JSON.stringify(appPackage), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }

  } catch (error) {
    console.error('Error generating form app:', error);
    // Always return a valid payload to avoid 500s on the client
    const fallback = {
      appName: 'form-app-fallback',
      files: {
        'README.md': `# Generation Fallback\n\nThe application could not be fully generated.\n\nError: ${String((error as any)?.message || error)}\n`,
        'index.html': '<!doctype html><html><head><meta charset="utf-8"><title>Fallback</title></head><body><h1>Generation Fallback</h1><p>See README.md for details.</p></body></html>'
      }
    };
    return new Response(JSON.stringify(fallback), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  }
});

function generateFormApplication(config: FormConfig) {
  const appName = config.formTitle.toLowerCase().replace(/[^a-z0-9]/g, '-');
  
  return {
    appName,
    files: {
      // Frontend files
      'index.html': generateHTMLFile(config),
      'style.css': generateCSSFile(),
      'script.js': generateJSFile(config),
      
      // Backend files
      'server.js': generateServerFile(config),
      'package.json': generatePackageJson(appName, config),
      
      // Database files
      'database/schema.sql': generateDatabaseSchema(config),
      'database/setup.js': generateDatabaseSetup(),
      
      // Configuration files
      '.env.example': generateEnvExample(),
      'README.md': generateReadme(appName, config),
      'deploy.sh': generateDeployScript(),
      
      // Docker files
      'Dockerfile': generateDockerfile(),
      'docker-compose.yml': generateDockerCompose(appName),
    }
  };
}

// Added: Multi-form app generator to fix ReferenceError
function generateMultiFormApplication(application: any, forms: any[]) {
  const appName = (application?.display_name || application?.name || 'multi-form-app')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '-');

  const sanitizedForms = (forms || []).map((f: any) => ({
    id: f.id,
    title: f.form_title || f.formConfig?.formTitle || 'Untitled Form',
    description: f.form_description || '',
    config: f.form_config || f.formConfig || { fields: [] },
  }));

  return {
    appName,
    files: {
      'index.html': generateMultiFormHTML(application, sanitizedForms),
      'style.css': generateCSSFile(),
      'script.js': generateMultiFormJS(sanitizedForms),
      'server.js': generateMultiFormServerFile(),
      'package.json': generateMultiFormPackageJson(appName),
      // Database files for multi-form app
      'database/schema.sql': generateMultiDatabaseSchema(),
      'database/setup.js': generateMultiDatabaseSetup(),
      '.env.example': generateEnvExample(),
      'README.md': generateMultiFormReadme(appName, application, sanitizedForms),
      'Dockerfile': generateDockerfile(),
      'docker-compose.yml': generateDockerCompose(appName),
    }
  };
}

function generateMultiFormHTML(application: any, forms: any[]): string {
  const title = application?.display_name || application?.name || 'Multi Form App';
  const formsJson = JSON.stringify(forms);
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${title}</title>
  <link rel="stylesheet" href="style.css" />
</head>
<body>
  <div class="container">
    <div class="form-container">
      <h1>${title}</h1>
      <p class="form-description">Select a form below to get started</p>
      <div id="nav" class="form-actions" style="margin-bottom: 16px;"></div>
      <div id="form-root"></div>
    </div>
  </div>
  <script>window.__FORMS__ = ${formsJson};</script>
  <script src="script.js"></script>
</body>
</html>`;
}

function generateMultiFormJS(forms: any[]): string {
  return `// Multi-form renderer
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
})();
`;
}

function generateMultiFormServerFile(): string {
  return `const express = require('express');
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
    'status TEXT DEFAULT \"submitted\"' +
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

app.listen(PORT, () => console.log('Server running on port ' + PORT));
`;
}

function generateMultiFormPackageJson(appName: string): string {
  return `{
  "name": "${appName}",
  "version": "1.0.0",
  "description": "Generated multi-form application",
  "main": "server.js",
  "scripts": {
    "start": "node server.js",
    "setup": "node database/setup.js"
  },
  "dependencies": {
    "express": "^4.18.2",
    "cors": "^2.8.5",
    "helmet": "^7.0.0",
    "dotenv": "^16.3.1",
    "sqlite3": "^5.1.6"
  }
}`;
}

function generateMultiFormReadme(appName: string, application: any, forms: any[]): string {
  return `# ${application?.display_name || application?.name || 'Multi Form App'}

A generated application bundling ${forms.length} forms.

## Quick start
1. npm install
2. npm run setup
3. npm start
4. Open http://localhost:3000

`;
}

// Multi-form database files
function generateMultiDatabaseSchema(): string {
  return `-- Schema for multi-form submissions
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
CREATE INDEX IF NOT EXISTS idx_submissions_submitted_at ON submissions(submitted_at);
`;
}

function generateMultiDatabaseSetup(): string {
  return `const sqlite3 = require('sqlite3').verbose();
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
});
`;
}
function generateHTMLFile(config: FormConfig): string {
  const fieldsHTML = config.fields
    .filter(field => field.type !== 'submit' && field.type !== 'cancel')
    .map(field => {
      const required = field.required ? 'required' : '';
      const placeholder = `Enter ${field.label.toLowerCase()}`;
      
      switch (field.type) {
        case 'text':
          return `
          <div class="form-group">
            <label for="${field.id}">${field.label} ${field.required ? '*' : ''}</label>
            <input type="text" id="${field.id}" name="${field.id}" placeholder="${placeholder}" ${required}>
          </div>`;
        case 'email':
          return `
          <div class="form-group">
            <label for="${field.id}">${field.label} ${field.required ? '*' : ''}</label>
            <input type="email" id="${field.id}" name="${field.id}" placeholder="${placeholder}" ${required}>
          </div>`;
        case 'phone':
          return `
          <div class="form-group">
            <label for="${field.id}">${field.label} ${field.required ? '*' : ''}</label>
            <input type="tel" id="${field.id}" name="${field.id}" placeholder="${placeholder}" ${required}>
          </div>`;
        case 'date':
          return `
          <div class="form-group">
            <label for="${field.id}">${field.label} ${field.required ? '*' : ''}</label>
            <input type="date" id="${field.id}" name="${field.id}" ${required}>
          </div>`;
        case 'number':
          return `
          <div class="form-group">
            <label for="${field.id}">${field.label} ${field.required ? '*' : ''}</label>
            <input type="number" id="${field.id}" name="${field.id}" placeholder="${placeholder}" ${required}>
          </div>`;
        case 'select':
          const options = field.options?.map(option => 
            `<option value="${option}">${option}</option>`
          ).join('') || '';
          return `
          <div class="form-group">
            <label for="${field.id}">${field.label} ${field.required ? '*' : ''}</label>
            <select id="${field.id}" name="${field.id}" ${required}>
              <option value="">Select ${field.label.toLowerCase()}...</option>
              ${options}
            </select>
          </div>`;
        case 'checkbox':
          return `
          <div class="form-group checkbox-group">
            <label class="checkbox-label">
              <input type="checkbox" id="${field.id}" name="${field.id}" ${required}>
              <span class="checkmark"></span>
              ${field.label} ${field.required ? '*' : ''}
            </label>
          </div>`;
        default:
          return `
          <div class="form-group">
            <label for="${field.id}">${field.label} ${field.required ? '*' : ''}</label>
            <input type="text" id="${field.id}" name="${field.id}" placeholder="${placeholder}" ${required}>
          </div>`;
      }
    }).join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${config.formTitle}</title>
    <link rel="stylesheet" href="style.css">
</head>
<body>
    <div class="container">
        <div class="form-container">
            <h1>${config.formTitle}</h1>
            ${config.formDescription ? `<p class="form-description">${config.formDescription}</p>` : ''}
            
            <form id="mainForm" novalidate>
                ${fieldsHTML}
                
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
    
    <script src="script.js"></script>
</body>
</html>`;
}

function generateCSSFile(): string {
  return `/* Modern Form Styling */
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
}

/* Loading animation */
.loading {
    opacity: 0.7;
    pointer-events: none;
}

.loading .btn-primary::after {
    content: '';
    width: 16px;
    height: 16px;
    margin-left: 8px;
    border: 2px solid transparent;
    border-top: 2px solid white;
    border-radius: 50%;
    display: inline-block;
    animation: spin 1s linear infinite;
}

@keyframes spin {
    to { transform: rotate(360deg); }
}`;
}

function generateJSFile(config: FormConfig): string {
  const validationRules = config.fields
    .filter(field => field.required || field.validation)
    .map(field => {
      const rules = [];
      if (field.required) {
        rules.push(`if (!formData.${field.id} || formData.${field.id}.trim() === '') {
          errors.push('${field.label} is required');
          isValid = false;
        }`);
      }
      
      if (field.type === 'email') {
        rules.push(`if (formData.${field.id} && !/^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(formData.${field.id})) {
          errors.push('Please enter a valid email address');
          isValid = false;
        }`);
      }
      
      return rules.join('\\n        ');
    }).join('\\n        ');

  return `// Form handling and validation
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
    
    // Validation rules
    ${validationRules}
    
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
        showFieldError(field, \`\${label} is required\`);
        return false;
    }
    
    // Email validation
    if (field.type === 'email' && value && !/^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(value)) {
        showFieldError(field, 'Please enter a valid email address');
        return false;
    }
    
    // Phone validation
    if (field.type === 'tel' && value && !/^[\\+]?[1-9][\\d]{0,15}$/.test(value.replace(/\\s/g, ''))) {
        showFieldError(field, 'Please enter a valid phone number');
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
}

// Auto-save functionality (optional)
function enableAutoSave() {
    const inputs = document.querySelectorAll('input, select, textarea');
    inputs.forEach(input => {
        input.addEventListener('input', () => {
            const formData = new FormData(document.getElementById('mainForm'));
            const data = Object.fromEntries(formData.entries());
            localStorage.setItem('formDraft', JSON.stringify(data));
        });
    });
    
    // Restore draft on page load
    const draft = localStorage.getItem('formDraft');
    if (draft) {
        const data = JSON.parse(draft);
        Object.keys(data).forEach(key => {
            const field = document.querySelector(\`[name="\${key}"]\`);
            if (field) {
                field.value = data[key];
            }
        });
    }
}

// Enable auto-save (uncomment if needed)
// enableAutoSave();`;
}

function generateServerFile(config: FormConfig): string {
  return `const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { body, validationResult } = require('express-validator');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Security middleware
app.use(helmet());
app.use(cors({
    origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
    credentials: true
}));

// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
    message: 'Too many requests from this IP, please try again later.'
});
app.use('/api/', limiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Serve static files
app.use(express.static('public'));

// Database setup
const dbPath = process.env.DATABASE_PATH || './database/submissions.db';
const db = new sqlite3.Database(dbPath);

// Initialize database
db.serialize(() => {
    db.run(\`CREATE TABLE IF NOT EXISTS submissions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        form_data TEXT NOT NULL,
        submitted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        ip_address TEXT,
        user_agent TEXT,
        status TEXT DEFAULT 'submitted'
    )\`);
});

// Validation rules for form fields
const validationRules = [
    ${config.fields
      .filter(field => field.required || field.type === 'email')
      .map(field => {
        if (field.required) {
          return `body('formData.${field.id}').notEmpty().withMessage('${field.label} is required')`;
        }
        if (field.type === 'email') {
          return `body('formData.${field.id}').isEmail().withMessage('Please enter a valid email address')`;
        }
      })
      .filter(Boolean)
      .join(',\n    ')}
];

// API Routes
app.post('/api/submit', validationRules, async (req, res) => {
    try {
        // Check validation results
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                errors: errors.array()
            });
        }

        const { formData, timestamp, userAgent } = req.body;
        const ipAddress = req.ip || req.connection.remoteAddress;

        // Store submission in database
        const stmt = db.prepare(\`INSERT INTO submissions (form_data, ip_address, user_agent) VALUES (?, ?, ?)\`);
        stmt.run(JSON.stringify(formData), ipAddress, userAgent, function(err) {
            if (err) {
                console.error('Database error:', err);
                return res.status(500).json({
                    success: false,
                    message: 'Failed to save submission'
                });
            }

            console.log('New submission saved with ID:', this.lastID);
            
            // Send success response
            res.json({
                success: true,
                message: 'Form submitted successfully',
                submissionId: this.lastID
            });
        });
        stmt.finalize();

    } catch (error) {
        console.error('Submission error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
});

// Get all submissions (admin endpoint - add authentication as needed)
app.get('/api/submissions', (req, res) => {
    db.all(\`SELECT * FROM submissions ORDER BY submitted_at DESC\`, (err, rows) => {
        if (err) {
            console.error('Database error:', err);
            return res.status(500).json({ error: 'Failed to fetch submissions' });
        }
        
        const submissions = rows.map(row => ({
            ...row,
            form_data: JSON.parse(row.form_data)
        }));
        
        res.json(submissions);
    });
});

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Catch-all handler for client-side routing
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({
        success: false,
        message: 'Something went wrong!'
    });
});

// Start server
app.listen(PORT, () => {
    console.log('Server running on port ' + PORT);
    console.log('Open http://localhost:' + PORT + ' to view your form');
});

// Graceful shutdown
process.on('SIGINT', () => {
    console.log('\\n🛑 Shutting down server...');
    db.close((err) => {
        if (err) {
            console.error('Error closing database:', err);
        } else {
            console.log('✅ Database connection closed');
        }
        process.exit(0);
    });
});`;
}

function generatePackageJson(appName: string, config: FormConfig): string {
  return `{
  "name": "${appName}",
  "version": "1.0.0",
  "description": "Generated form application: ${config.formTitle}",
  "main": "server.js",
  "scripts": {
    "start": "node server.js",
    "dev": "nodemon server.js",
    "setup": "node database/setup.js",
    "build": "echo 'No build step required'",
    "test": "echo 'No tests specified'"
  },
  "keywords": ["form", "web-app", "nodejs", "express"],
  "author": "Generated by Form Builder",
  "license": "MIT",
  "dependencies": {
    "express": "^4.18.2",
    "cors": "^2.8.5",
    "helmet": "^7.0.0",
    "express-rate-limit": "^6.8.1",
    "express-validator": "^7.0.1",
    "sqlite3": "^5.1.6",
    "dotenv": "^16.3.1"
  },
  "devDependencies": {
    "nodemon": "^3.0.1"
  },
  "engines": {
    "node": ">=16.0.0",
    "npm": ">=8.0.0"
  }
}`;
}

function generateDatabaseSchema(config: FormConfig): string {
  const fieldsSchema = config.fields
    .filter(field => field.type !== 'submit' && field.type !== 'cancel')
    .map(field => {
      const sqlType = field.type === 'number' ? 'INTEGER' : 
                     field.type === 'date' ? 'DATE' : 'TEXT';
      const nullable = field.required ? 'NOT NULL' : '';
      return `    ${field.id} ${sqlType} ${nullable}`;
    }).join(',\n');

  return `-- Database schema for ${config.formTitle}
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

-- Create normalized form data table (optional)
CREATE TABLE IF NOT EXISTS form_responses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    submission_id INTEGER,
${fieldsSchema},
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (submission_id) REFERENCES submissions(id)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_submissions_submitted_at ON submissions(submitted_at);
CREATE INDEX IF NOT EXISTS idx_submissions_status ON submissions(status);
CREATE INDEX IF NOT EXISTS idx_form_responses_submission_id ON form_responses(submission_id);

-- Insert sample data (remove in production)
INSERT OR IGNORE INTO submissions (form_data, ip_address) VALUES 
('{"name": "John Doe", "email": "john@example.com"}', '127.0.0.1');`;
}

function generateDatabaseSetup(): string {
  return `const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const path = require('path');

console.log('🗃️  Setting up database...');

// Create database directory if it doesn't exist
const dbDir = path.dirname(__filename);
if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
}

// Initialize database
const db = new sqlite3.Database('./database/submissions.db');

// Read and execute schema
const schemaPath = path.join(__dirname, 'schema.sql');
const schema = fs.readFileSync(schemaPath, 'utf8');

db.exec(schema, (err) => {
    if (err) {
        console.error('❌ Error setting up database:', err);
        process.exit(1);
    } else {
        console.log('✅ Database setup complete!');
        console.log('📍 Database location: ./database/submissions.db');
    }
    
    db.close();
});`;
}

function generateEnvExample(): string {
  return `# Server Configuration
PORT=3000
NODE_ENV=development

# Security
ALLOWED_ORIGINS=http://localhost:3000,https://yourdomain.com

# Database Configuration
DATABASE_PATH=./database/submissions.db

# Optional: Email Configuration (for notifications)
# SMTP_HOST=smtp.gmail.com
# SMTP_PORT=587
# SMTP_USER=your-email@gmail.com
# SMTP_PASS=your-app-password

# Optional: Analytics
# GOOGLE_ANALYTICS_ID=GA_MEASUREMENT_ID

# Optional: Rate Limiting
# RATE_LIMIT_WINDOW_MS=900000
# RATE_LIMIT_MAX_REQUESTS=100`;
}

function generateReadme(appName: string, config: FormConfig): string {
  return `# ${config.formTitle}

A complete, self-contained form application generated automatically.

## 🚀 Quick Start

### Prerequisites
- Node.js 16+ and npm 8+
- (Optional) Docker for containerized deployment

### Installation

1. **Install dependencies:**
   \`\`\`bash
   npm install
   \`\`\`

2. **Set up the database:**
   \`\`\`bash
   npm run setup
   \`\`\`

3. **Configure environment:**
   \`\`\`bash
   cp .env.example .env
   # Edit .env with your settings
   \`\`\`

4. **Start the application:**
   \`\`\`bash
   # Development mode
   npm run dev
   
   # Production mode  
   npm start
   \`\`\`

5. **Open your browser:**
   Navigate to \`http://localhost:3000\`

## 📁 Project Structure

\`\`\`
${appName}/
├── index.html          # Frontend form interface
├── style.css           # Styling and responsive design
├── script.js           # Client-side validation and interaction
├── server.js           # Express.js backend server
├── package.json        # Node.js dependencies and scripts
├── database/
│   ├── schema.sql      # Database schema
│   ├── setup.js        # Database initialization script
│   └── submissions.db  # SQLite database file (created automatically)
├── .env.example        # Environment variables template
├── Dockerfile          # Docker container configuration
├── docker-compose.yml  # Docker Compose setup
└── deploy.sh           # Deployment script
\`\`\`

## 🔧 Configuration

### Environment Variables
Copy \`.env.example\` to \`.env\` and configure:

- \`PORT\`: Server port (default: 3000)
- \`ALLOWED_ORIGINS\`: CORS allowed origins
- \`DATABASE_PATH\`: SQLite database file path

### Form Fields
This form includes the following fields:
${config.fields.map(field => `- **${field.label}** (${field.type})${field.required ? ' - Required' : ''}`).join('\n')}

## 🚀 Deployment Options

### Option 1: Traditional Server Deployment

1. **Upload files to your server**
2. **Install Node.js and npm**
3. **Run setup commands:**
   \`\`\`bash
   npm install
   npm run setup
   npm start
   \`\`\`

### Option 2: Docker Deployment

1. **Build and run with Docker:**
   \`\`\`bash
   docker-compose up -d
   \`\`\`

2. **Or use the deployment script:**
   \`\`\`bash
   chmod +x deploy.sh
   ./deploy.sh
   \`\`\`

### Option 3: Cloud Platform Deployment

#### Heroku
\`\`\`bash
# Install Heroku CLI, then:
heroku create ${appName}
git init
git add .
git commit -m "Initial commit"
git push heroku main
\`\`\`

#### Railway/Render/DigitalOcean
- Connect your Git repository
- Set build command: \`npm install\`
- Set start command: \`npm start\`
- Add environment variables from \`.env.example\`

## 📊 Features

- ✅ **Responsive Design** - Works on all devices
- ✅ **Client-side Validation** - Real-time form validation
- ✅ **Server-side Validation** - Secure backend validation
- ✅ **Database Storage** - SQLite database for submissions
- ✅ **Rate Limiting** - Protection against spam
- ✅ **Security Headers** - Helmet.js security middleware
- ✅ **Auto-save Draft** - Optional draft saving functionality
- ✅ **Error Handling** - Comprehensive error management
- ✅ **Admin API** - View all submissions via API

## 🛠️ API Endpoints

- \`POST /api/submit\` - Submit form data
- \`GET /api/submissions\` - Get all submissions (admin)
- \`GET /api/health\` - Health check

## 🔒 Security Features

- CORS protection
- Rate limiting
- Input validation
- SQL injection protection
- XSS protection via Helmet.js
- Request size limiting

## 📈 Monitoring & Analytics

### View Submissions
Access submissions data:
\`\`\`bash
# View all submissions
curl http://localhost:3000/api/submissions

# Or check the database directly
sqlite3 database/submissions.db "SELECT * FROM submissions;"
\`\`\`

### Add Google Analytics (Optional)
Add your GA4 measurement ID to the HTML file:
\`\`\`html
<!-- Add before closing </head> tag -->
<script async src="https://www.googletagmanager.com/gtag/js?id=GA_MEASUREMENT_ID"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', 'GA_MEASUREMENT_ID');
</script>
\`\`\`

## 🐛 Troubleshooting

### Common Issues

1. **Port already in use:**
   \`\`\`bash
   # Change PORT in .env file or:
   PORT=3001 npm start
   \`\`\`

2. **Database errors:**
   \`\`\`bash
   # Reset database:
   rm database/submissions.db
   npm run setup
   \`\`\`

3. **Permission errors:**
   \`\`\`bash
   # Fix file permissions:
   chmod +x deploy.sh
   \`\`\`

## 📝 Customization

### Styling
Edit \`style.css\` to customize the appearance:
- Colors and themes
- Layout and spacing  
- Responsive breakpoints
- Animations and transitions

### Validation
Modify validation rules in:
- \`script.js\` (client-side)
- \`server.js\` (server-side)

### Database Schema
Update \`database/schema.sql\` for custom fields or tables.

## 📞 Support

This is a generated application. For customization help:
1. Check the inline comments in the code
2. Refer to the documentation for used libraries
3. Test changes in development mode first

## 📜 License

MIT License - Feel free to modify and distribute.

---

**Generated by Form Builder** 🎯
Form: ${config.formTitle}
Generated: ${new Date().toLocaleDateString()}`;
}

function generateDeployScript(): string {
  return `#!/bin/bash

# Deployment script for the form application
echo "🚀 Starting deployment..."

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 16+ first."
    exit 1
fi

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo "❌ npm is not installed. Please install npm first."
    exit 1
fi

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Set up database
echo "🗃️  Setting up database..."
npm run setup

# Create .env file if it doesn't exist
if [ ! -f .env ]; then
    echo "⚙️  Creating environment configuration..."
    cp .env.example .env
    echo "📝 Please edit .env file with your configuration"
fi

# Build (if needed - currently no build step)
echo "🔨 Building application..."
npm run build

# Test the application
echo "🧪 Starting test server..."
timeout 10s npm start &
sleep 5

# Check if server is running
if curl -f http://localhost:3000/api/health &> /dev/null; then
    echo "✅ Deployment successful!"
    echo "🌐 Your form is ready at: http://localhost:3000"
    echo ""
    echo "Next steps:"
    echo "1. Edit .env file for production settings"
    echo "2. Configure your domain/reverse proxy"
    echo "3. Set up SSL certificate"
    echo "4. Monitor logs: tail -f access.log"
    echo ""
    echo "To start in production mode:"
    echo "npm start"
else
    echo "❌ Deployment failed. Check the logs above."
    exit 1
fi`;
}

function generateDockerfile(): string {
  return `# Multi-stage Node.js application
FROM node:18-alpine AS base

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

# Create non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nextjs -u 1001

USER nextjs

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \\
  CMD curl -f http://localhost:3000/api/health || exit 1

# Start the application
CMD ["npm", "start"]`;
}

function generateDockerCompose(appName: string): string {
  return `version: '3.8'

services:
  app:
    build: .
    container_name: ${appName}
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - PORT=3000
    volumes:
      - ./database:/app/database
      - ./logs:/app/logs
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/api/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s

  # Optional: Add nginx reverse proxy
  nginx:
    image: nginx:alpine
    container_name: ${appName}-nginx
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf:ro
      - ./ssl:/etc/nginx/ssl:ro
    depends_on:
      - app
    restart: unless-stopped

networks:
  default:
    name: ${appName}-network`;
}