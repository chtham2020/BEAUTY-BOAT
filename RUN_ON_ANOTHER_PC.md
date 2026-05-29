# Run Beauty Boat On Another Windows PC

These commands run Beauty Boat from GitHub on another Windows PC with your own port.

## 1. Clone Or Update From GitHub

For a new folder:

```powershell
cd C:\Users\<YOUR_USER>\Documents
git clone -b codex/hermes-ai-assistant https://github.com/chtham2020/BEAUTY-BOAT.git "Beauty Boat"
cd "Beauty Boat"
```

For an existing folder:

```powershell
cd "C:\path\to\Beauty Boat"
git pull
```

## 2. Install And Prepare The Database

```powershell
npm.cmd install
Copy-Item .env.example .env
npx.cmd prisma generate
npx.cmd prisma db push
npm.cmd run db:seed
```

Edit `.env` if you want a fixed default port for this PC:

```env
BEAUTY_BOAT_PORT=4000
BEAUTY_BOAT_HOST=0.0.0.0
BEAUTY_BOAT_APP_URL=http://YOUR_PC_LAN_IP:4000
```

## 3. Run On A Chosen Port

Use a one-time port:

```powershell
npm.cmd run dev -- --port 4000
```

Or use the port from `.env`:

```powershell
npm.cmd run dev
```

Open the site on the same PC:

```text
http://localhost:4000
```

Open the site from a phone or another device on the same Wi-Fi:

```text
http://<PC-LAN-IP>:4000
```

To find the PC LAN IP:

```powershell
ipconfig
```

Use the IPv4 address for the active Wi-Fi or Ethernet adapter.

If the phone cannot open the site, allow Node.js or port `4000` through Windows Defender Firewall.

## 4. Rebuild The Android APK For That PC

The Android app opens the live Beauty Boat web service URL. Before building the APK, set the URL to the other PC LAN IP and port:

```powershell
$env:BEAUTY_BOAT_APP_URL="http://<PC-LAN-IP>:4000"
npm.cmd run android:sync
npm.cmd run android:build:apk
```

Install this APK on the Android phone:

```text
android\app\build\outputs\apk\debug\app-debug.apk
```

Keep the Beauty Boat server running on the PC while using the Android app.

## Useful Commands

Run default port `3000`:

```powershell
npm.cmd run dev
```

Run custom port from PowerShell environment:

```powershell
$env:BEAUTY_BOAT_PORT="4001"
npm.cmd run dev
```

Run production build locally:

```powershell
npm.cmd run build
npm.cmd run start -- --port 4000
```
