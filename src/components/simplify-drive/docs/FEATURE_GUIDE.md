# SimplifyDrive Feature Guide

> User-facing documentation for all SimplifyDrive features.

---

## Quick Start

### Uploading Your First Document

1. Click the **Upload** button in the header
2. Drag & drop files or click to browse
3. Optionally enable **AI indexing** for smart search
4. Click **Upload** to process

Your document will be automatically:
- ✅ Text extracted (OCR for scanned docs)
- ✅ Classified by type
- ✅ Tagged with relevant labels
- ✅ Indexed for search

---

## Core Features

### 📁 Documents

The main document management view.

**Grid View** - Visual thumbnail layout for browsing
**List View** - Detailed table with metadata

**Actions:**
- Click to preview
- Right-click for context menu
- Drag to folders

### ⚡ Quick Access

Pin important documents for instant access.

**Priority Levels:**
- 🔴 High - Top of the list
- 🟡 Medium - Standard priority
- 🟢 Low - Quick reference

**To Pin:**
1. Right-click any document
2. Select "Add to Quick Access"
3. Choose priority level

### ⭐ Favorites (Starred)

Save documents you access frequently.

**Features:**
- Custom star colors for organization
- Add notes to favorites
- Sort by date added or name

**To Star:**
- Click the star icon on any document
- Or right-click → "Add to Favorites"

---

## Organization

### 📂 Smart Folders

AI-powered automatic organization.

**System Folders:**
| Folder | Contents |
|--------|----------|
| Recent | Last 7 days |
| Important | High importance score |
| Financial | Invoices, receipts |
| Legal | Contracts, agreements |
| Correspondence | Emails, letters |

**Create Custom Smart Folder:**
1. Click "New Smart Folder"
2. Define rules (type, date, tags)
3. Documents auto-organize

### 🏷️ Tags

Organize with custom labels.

**AI-Suggested Tags:**
- Shown with ✨ sparkle icon
- Click to apply
- AI learns from your choices

**Custom Tags:**
1. Select document(s)
2. Click "Add Tag"
3. Enter tag name & color

---

## Sharing & Collaboration

### 🔗 Share Links

Create shareable links with controls.

**Link Options:**
- **Password Protection** - Require password to access
- **Expiration Date** - Auto-expire after date
- **Download Restriction** - View-only access
- **Download Limit** - Max number of downloads
- **Watermark** - Apply watermark to downloads

**To Create:**
1. Select document
2. Click "Share" → "Create Link"
3. Configure options
4. Copy & share link

### 👥 Guest Sharing

Share with external users (no account needed).

**Access Levels:**
| Level | Permissions |
|-------|-------------|
| View | Read-only access |
| Comment | View + add comments |
| Edit | View + modify content |

### 🔒 Check-In/Check-Out

Prevent conflicts with document locking.

**Check Out:**
1. Right-click document
2. Select "Check Out"
3. Document is locked to you

**Check In:**
1. Right-click checked-out document
2. Select "Check In"
3. Optionally create new version

**Force Check-In (Admin):**
- Override another user's checkout
- Requires admin permission

---

## AI Features

### ✨ AI Summaries

Generate intelligent document summaries.

**Summary Types:**
| Type | Description |
|------|-------------|
| Executive | Brief 2-paragraph overview |
| Detailed | Comprehensive summary |
| Key Points | Bullet point highlights |
| Action Items | Tasks with deadlines |

**To Generate:**
1. Select document
2. Click "AI Summary"
3. Choose summary type
4. Select language (optional)

### 🔍 Smart Search

Natural language document search.

**Example Queries:**
- "contracts expiring next month"
- "invoices from Acme Corp over $5000"
- "documents I shared last week"
- "similar to this contract"

**Search Operators:**
| Operator | Example | Description |
|----------|---------|-------------|
| `type:` | `type:invoice` | Filter by document type |
| `tag:` | `tag:urgent` | Filter by tag |
| `from:` | `from:2024-01-01` | Created after date |
| `to:` | `to:2024-12-31` | Created before date |

### 📊 Compare

Side-by-side document comparison.

**Views:**
- **Unified** - Single view with highlights
- **Split** - Side-by-side panels
- **Inline** - Changes shown inline

**To Compare:**
1. Select two documents
2. Click "Compare"
3. Choose view mode

---

## Compliance & Governance

### 📋 Workflows

Automated document processes.

**Workflow Types:**
- Approval workflows
- Review cycles
- Signature collection
- Document routing

**Creating Workflows:**
1. Go to Workflows tab
2. Click "New Workflow"
3. Define stages and approvers
4. Set triggers and conditions

### 🔐 Retention Policies

Automatic document lifecycle management.

**Policy Options:**
- Retain for X days/months/years
- Auto-archive after period
- Auto-delete after period
- Require approval for deletion

### ⚖️ Legal Hold

Preserve documents for legal/compliance.

**Features:**
- Prevent deletion of held documents
- Suspend retention policies
- Track custodians
- Audit trail

### 📜 Audit Trail

Complete activity history.

**Tracked Events:**
- View, download, print
- Edit, delete, restore
- Share, unshare
- Workflow actions

---

## Advanced Features

### 🏷️ Custom Metadata

Add custom fields to documents.

**Field Types:**
- Text
- Number
- Date
- Dropdown (single select)
- Tags (multi-select)
- Checkbox

**To Create Fields:**
1. Go to Metadata tab
2. Click "Add Field"
3. Configure field type and options
4. Apply to document types

### 💧 Watermarks

Protect documents with watermarks.

**Watermark Options:**
- Text watermark (custom text)
- Dynamic fields (user, date)
- Position (center, diagonal, tile)
- Opacity and rotation

### 👤 Ownership Transfer

Transfer documents to other users.

**To Transfer:**
1. Select document(s)
2. Click "Transfer Ownership"
3. Select new owner
4. Choose transfer options

**Options:**
- Transfer version history
- Transfer shares
- Notify collaborators

### 📥 Migration

Import from external services.

**Supported Sources:**
- Google Drive
- Microsoft OneDrive
- SharePoint
- IBM FileNet
- Local folders

**Migration Options:**
- Preserve folder structure
- Preserve metadata
- Handle duplicates (skip/rename/overwrite)

---

## Views & Navigation

### View Modes

**Grid View:**
- Thumbnail previews
- Visual browsing
- Best for images/documents

**List View:**
- Detailed information
- More documents visible
- Best for data-heavy work

### Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl+U` | Upload document |
| `Ctrl+F` | Focus search |
| `Ctrl+G` | Toggle grid/list view |
| `Ctrl+S` | Star/unstar selected |
| `Delete` | Delete selected |
| `Enter` | Open selected |
| `Esc` | Close dialog/clear selection |

---

## Settings & Preferences

### Display Settings

- Default view mode (grid/list)
- Items per page
- Thumbnail size
- Date format

### AI Settings

- Enable/disable auto-tagging
- Enable/disable auto-summaries
- Summary language preference
- Recommendation frequency

### Notification Settings

- Email notifications
- In-app notifications
- Workflow reminders
- Share activity alerts

---

## Troubleshooting

### Document Not Processing

**Causes:**
- Unsupported format
- File too large
- Processing queue busy

**Solutions:**
1. Check supported formats
2. Try smaller file
3. Wait and retry

### Search Not Finding Documents

**Causes:**
- Document still processing
- Search terms too specific
- Filters applied

**Solutions:**
1. Wait for processing to complete
2. Use broader search terms
3. Clear all filters

### Share Link Not Working

**Causes:**
- Link expired
- Password required
- Download limit reached

**Solutions:**
1. Check expiration date
2. Verify password
3. Create new link

---

## Best Practices

### Organization
✅ Use consistent naming conventions
✅ Apply tags consistently
✅ Create smart folders for common filters
✅ Archive old documents regularly

### Security
✅ Set expiration on share links
✅ Use password protection for sensitive docs
✅ Enable watermarks for confidential content
✅ Review share permissions regularly

### Performance
✅ Upload in batches for large imports
✅ Use list view for many documents
✅ Enable only needed AI features
✅ Archive unused documents

---

*Feature Guide v1.0.0 | Last Updated: December 2024*
