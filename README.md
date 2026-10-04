# Mosa

Bot Discord và giao diện quản trị Next.js.

Xem [cấu trúc dự án và hướng dẫn chạy](docs/architecture.md).

---

📜 Mosa – Terms of Service
Last Updated: [Insert Date]
1. Acceptance of Terms
By adding or using Mosa (the “Bot”) in your Discord server or personal account, you agree to these Terms of Service (“Terms”). If you do not agree, you must remove the Bot immediately.
2. Description of Service
Mosa is a Discord bot designed to provide entertainment, utilities, and other automated features within Discord servers. Features may change over time as updates are deployed.
3. Eligibility
You must comply with:
Discord’s Terms of Service


All applicable local, state, national, and international laws


Any age restrictions set by Discord


Use of the Bot by minors must be supervised by a parent or guardian where required by law.
4. Usage Guidelines
You agree not to use Mosa for:
Harassment, discrimination, or harmful misconduct


Malicious automation (spam, raids, self-bots, etc.)


Attempting to exploit bugs or vulnerabilities


Reverse engineering or attempting to extract source code


Any activity that violates Discord’s Community Guidelines


We reserve the right to blacklist, restrict, or block users or servers that violate these Terms.
5. Availability
Mosa is provided “as is” with no guarantee of uptime, reliability, or continued functionality. Maintenance, updates, or outages may occur at any time.
6. Modifications
We may modify or update these Terms at any time. Continued use of the Bot after changes become effective constitutes acceptance of the revised Terms.
7. Termination
We may remove, disable, or restrict access to the Bot for any reason, including but not limited to:
Abuse or misuse


Violation of these Terms


Technical issues


You may stop using the Bot at any time by removing it from your server.
8. Disclaimer of Warranties
Mosa is provided without warranties, express or implied. We do not guarantee that the Bot will function error-free or uninterrupted.
9. Limitation of Liability
In no event shall the Bot’s developers be liable for:
Loss of data


Damages resulting from misuse


Unauthorized access or modifications


Your use of the Bot is at your own risk.
10. Contact
For questions or concerns regarding these Terms, you may contact the development team:
 Email: uongsythanganh@gmail.com
 Discord: https://discord.gg/jd93WVuKTQ

🔒 Mosa – Privacy Policy
Last Updated: 12/07/2025
1. Information We Collect
Mosa may collect and temporarily process certain data in order to function. This may include:
1.1 Automatically Collected Data
Discord User IDs


Discord Server IDs


Channel IDs


Message IDs (for features requiring message context)


Interaction data (commands used, button clicks, etc.)


1.2 User-Provided Data
Some features may require user-generated content, such as:
Submitted forms or commands


Settings and configuration data


1.3 Data We Do Not Collect
We do not collect:
Messages or content outside command interactions


Passwords or authentication credentials


Personal information such as real names, emails, or IP addresses (unless explicitly provided for support)


Mosa never listens to or stores voice data.

2. How We Use Collected Data
Data is used strictly for:
Delivering the bot’s core functionality


Improving performance and user experience


Troubleshooting errors or abuse


Server-specific configuration and customization


We do not sell or share your data with third parties.

3. Data Storage & Retention
Only the minimum required data is stored.


Data may be stored in temporary logs for debugging but is purged regularly.


Server configuration and settings may be stored until you remove the Bot or reset the data.


You may request deletion of server-specific data at any time.

4. Data Sharing
We may share data only under these circumstances:
If required by law (e.g., valid legal request)


To prevent harm or respond to ToS violations


With trusted hosting or security providers, solely to operate the Bot


We do not share user data for marketing or advertising.

5. Security
We take reasonable measures to protect data from unauthorized access. However, no method of digital transmission is 100% secure. Use of the Bot is at your own risk.

6. Children’s Privacy
Mosa does not knowingly collect data from children under the age required by Discord. If you believe such data has been collected, contact us to request removal.

7. Third-Party Services
Mosa operates on the Discord platform and may rely on additional services (hosting, databases, etc.). These services have their own privacy policies that may apply.

8. Changes to This Policy
We may update this Privacy Policy at any time. Continued use of the Bot after changes take effect means you accept the updated policy.

9. Contact
For privacy-related questions or requests, contact:
 Email: uongsythanganh@gmail.com
 Discord: https://discord.gg/jd93WVuKTQ

If you'd like, I can also:
 ✅ Format these for a website
 ✅ Add GDPR/CCPA compliance sections
 💠 Add data deletion commands for your bot
 📘 Generate a Markdown or HTML version
Just tell me what you need!

## Frontend development

The web interface uses Next.js. Set `NEXT_PUBLIC_DISCORD_CLIENT_ID` to the same
Discord application ID used as `DISCORD_CLIENT_ID` by Flask, and configure
`DISCORD_CLIENT_SECRET` in the Flask environment. The Games page authenticates
Discord Activities with the Embedded App SDK and exchanges its authorization
code through Flask; the client secret remains server-side. Outside Discord, the
Games page falls back to the existing `/login` OAuth flow. Install dependencies
with `npm ci`. Run `npm run dev` while the Flask backend is running on
`http://127.0.0.1:5000`; the Next.js development server proxies `/api/*` and the
`/login` and `/logout` routes to Flask. Set `FLASK_API_URL` if the backend uses
a different address.
Configure `DISCORD_CLIENT_SECRET`, `OWNER_ID`, and a strong, private
`FLASK_SECRET_KEY` in the Flask environment. Panel administration APIs are
restricted to the Discord account identified by `OWNER_ID`. Welcome embed
settings are saved under `DATA_FOLDER` (default `data`) and sent when a member
joins the selected server. Uploaded welcome banners are stored in
`DATA_FOLDER/welcome_banners` and served from the Flask app's public URL.

Discord Activity launches at `/` with `frame_id` and `instance_id` are redirected
to `/games`, preserving the launch query parameters. Embedded Game Hub
authentication requests the Discord `identify` and `guilds` scopes and uses a
signed API ticket so authentication does not depend on third-party session
cookies. Keep the Activity root URL mapping pointed at this web
application's root; ordinary visits to `/` still open `/panel`.

Run `npm run build` to create the static site in `out/`. In production, the Flask
server redirects `/` to `/panel` and serves the static export for `/panel`
and `/music`, plus the game hub at `/games`. Game rooms and tournaments use the
Flask Game Hub API and persistent data under `DATA_FOLDER`. The deployment
workflow passes `DISCORD_CLIENT_ID` as `NEXT_PUBLIC_DISCORD_CLIENT_ID` to build
the bot invite link in the panel.
