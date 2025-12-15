# LiveKit Video Chat App

A real-time video conferencing application built with Next.js 16 and LiveKit, featuring user authentication, room management, cloud recording, and AI-powered meeting assistance.

**Live URL**: https://livekit.technosmart.id

## Features

- **Real-time Video Conferencing**: High-quality video and audio powered by LiveKit
- **Room Management**: Create and manage video rooms with shareable links
- **Cloud Recording**: Automatically record meetings to S3-compatible storage
- **AI Meeting Assistant**: Real-time transcription and AI-powered meeting insights
- **Authentication**: Email/password and Google OAuth support
- **Screen Sharing**: Share your screen with meeting participants
- **Chat**: In-meeting text chat with timestamps
- **Guest Access**: Allow guests to join without accounts
- **Scheduled Meetings**: Plan meetings in advance
- **Recording Playback**: Watch recordings with synced chat timeline and transcripts

## Tech Stack

- **Framework**: Next.js 16 (App Router, Turbopack)
- **UI**: React 19, Tailwind CSS 4, shadcn/ui components
- **Authentication**: NextAuth.js v4 (credentials + Google OAuth)
- **Database**: PostgreSQL with Drizzle ORM
- **Video**: LiveKit (client SDK + server SDK)
- **Storage**: S3-compatible (iDrive E2) for recordings
- **Deployment**: Dokploy on AWS EC2
- **AI**: OpenRouter API (Google Gemma 3 4B)

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- PostgreSQL database
- LiveKit server instance
- S3-compatible storage (e.g., iDrive E2, AWS S3)
- Google OAuth credentials (optional)
- OpenRouter API key (optional, for AI assistant)

### Installation

1. Clone the repository:

```bash
git clone <repository-url>
cd livekit-app
```

2. Install dependencies:

```bash
npm install
```

3. Set up environment variables (see [Environment Variables](#environment-variables))

4. Push database schema:

```bash
npx drizzle-kit push
```

5. Run the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the application.

## Environment Variables

Create a `.env.local` file in the root directory with the following variables:

```env
# Application
NEXT_PUBLIC_APP_NAME=Video Chat

# Database
DATABASE_URL=postgresql://user:password@host:5432/database

# NextAuth
NEXTAUTH_SECRET=your-random-secret-string
NEXTAUTH_URL=https://example.com

# Google OAuth (optional)
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret

# LiveKit
LIVEKIT_API_KEY=your-livekit-api-key
LIVEKIT_API_SECRET=your-livekit-api-secret
LIVEKIT_URL=https://your-livekit-server.livekit.cloud
NEXT_PUBLIC_LIVEKIT_URL=wss://your-livekit-server.livekit.cloud

# S3 Storage (for recordings)
S3_ENDPOINT=your-bucket.s3.example.com
S3_ACCESS_KEY_ID=your-access-key
S3_SECRET_ACCESS_KEY=your-secret-key
S3_BUCKET=livekit-recordings
S3_REGION=us-east-1

# AI Assistant (optional)
AI_PROVIDER=openrouter
AI_API_KEY=your-openrouter-api-key
AI_MODEL=google/gemma-3-4b-it
```

## S3/iDrive E2 CORS Configuration

For video streaming to work properly, you need to configure CORS on your S3 bucket. This allows the browser to load videos from your S3 storage when accessed from your application domain.

### CORS Configuration JSON

**IMPORTANT**: In iDrive E2, CORS configuration is set per-bucket, not per-region. You must navigate to your specific bucket (e.g., `livekit-uploads`) and configure CORS there.

In your S3 bucket CORS settings, add the following policy:

```json
[
  {
    "AllowedOrigins": [
      "https://example.com",
      "http://localhost:3000"
    ],
    "AllowedMethods": [
      "GET",
      "HEAD"
    ],
    "AllowedHeaders": [
      "*"
    ],
    "ExposeHeaders": [
      "Content-Length",
      "Content-Type",
      "ETag",
      "Accept-Ranges",
      "Content-Range",
      "x-amz-request-id"
    ],
    "MaxAgeSeconds": 3600
  }
]
```

**Important**:
- Replace `https://example.com` with your actual domain (e.g., `https://livekit.technosmart.id`)
- Make sure to configure CORS on the **bucket itself**, not just the region
- The `Accept-Ranges` and `Content-Range` headers are critical for video streaming

### Why CORS is Required

- Video files are served from a different domain (S3) than your application
- Browsers enforce CORS policy to prevent unauthorized cross-origin requests
- Without proper CORS headers, video playback will fail with CORS errors

## LiveKit Egress Configuration

For cloud recording to work, configure your LiveKit server with egress settings:

```yaml
# livekit.yaml
egress:
  cpu_cost:
    room_composite_cpu_cost: 2  # Required for 2 CPU servers
  s3:
    endpoint: https://your-bucket.s3.example.com
    access_key: your-access-key
    secret: your-secret-key
    bucket: livekit-recordings
    region: us-east-1
```

The `cpu_cost.room_composite_cpu_cost: 2` setting is crucial if your LiveKit server runs on a machine with only 2 CPUs, as it allows recordings to proceed without the default 4 CPU requirement.

## Database Schema

Main tables:

- **users**: User accounts (email, name, passwordHash, image)
- **accounts**: OAuth provider accounts (NextAuth)
- **sessions**: User sessions (NextAuth)
- **rooms**: Video rooms (slug, name, ownerId, password, allowGuests, scheduledAt)
- **recordings**: Room recordings (s3Key, egressId, shareToken, status, chatLog, transcript)
- **participants**: Room participation history

Use Drizzle Studio to view and manage the database:

```bash
npx drizzle-kit studio
```

## Project Structure

```
src/
├── app/
│   ├── (auth)/              # Auth pages (login, register)
│   ├── (protected)/         # Protected routes (dashboard)
│   │   └── dashboard/
│   │       ├── page.tsx     # Main dashboard
│   │       ├── rooms/       # Room management
│   │       └── recordings/  # Recording management
│   ├── api/
│   │   ├── auth/            # NextAuth routes
│   │   ├── token/           # LiveKit token generation
│   │   ├── rooms/           # Room CRUD
│   │   ├── recording/       # Recording webhook + public stream
│   │   └── recordings/      # Recording management (stream, download, share)
│   ├── room/[slug]/         # Shareable room page
│   └── recording/[token]/   # Public recording view/download
├── components/
│   ├── auth/                # Auth forms and user menu
│   ├── dashboard/           # Dashboard components
│   ├── providers/           # Context providers
│   ├── room/                # Room join form
│   ├── ui/                  # shadcn/ui components
│   ├── video/               # Video player and timeline components
│   └── video-room.tsx       # Main video conferencing component
├── db/
│   ├── index.ts             # Database connection
│   └── schema.ts            # Drizzle schema
└── lib/
    └── auth.ts              # NextAuth configuration
```

## Key API Routes

- `POST /api/token` - Generate LiveKit access token
- `POST /api/rooms` - Create a new room
- `GET /api/rooms` - List user's rooms
- `POST /api/recording` - Recording webhook from LiveKit
- `GET /api/recordings/[id]/stream` - Get video stream URL (authenticated)
- `GET /api/recordings/[id]/download` - Download recording (authenticated)
- `POST /api/recordings/[id]/share` - Generate public share link
- `GET /api/recording/[token]/stream` - Public video stream (with share token)

## Development Commands

```bash
# Start development server
npm run dev

# Build for production
npm run build

# Start production server
npm run start

# Database migrations
npx drizzle-kit push          # Push schema changes
npx drizzle-kit studio        # Open database studio

# Linting and formatting
npm run lint
```

## Deployment

This application is deployed via Dokploy on AWS EC2.

### Deployment Configuration

- **Platform**: Dokploy (Docker-based deployment)
- **Application ID**: `9vy9uREqwAVfRsVtf--ln`
- **Auto-deploy**: Enabled on push to `master` branch
- **Server**: AWS EC2 (t3.medium or larger recommended)

### Dockerfile Notes

The project uses a multi-stage Docker build optimized for Next.js standalone output:

1. **Base**: Node.js 20 Alpine
2. **Dependencies**: Install production dependencies
3. **Builder**: Build Next.js application
4. **Runner**: Minimal production image with standalone output

### Environment Variables in Production

Ensure all required environment variables are set in Dokploy:
- Database connection string
- LiveKit credentials
- S3/iDrive E2 credentials
- NextAuth secret and URL
- OAuth credentials (if using Google login)

## Common Issues

### Video Not Playing

If videos don't play in the browser:

1. Check S3 CORS configuration (see [S3/iDrive E2 CORS Configuration](#s3idrive-e2-cors-configuration))
2. Verify S3 credentials are correct in environment variables
3. Ensure presigned URLs are being generated correctly (check browser network tab)
4. Confirm S3 bucket is accessible from your LiveKit server

### Recording Not Starting

If recordings fail to start:

1. Check LiveKit egress configuration in your LiveKit server
2. Verify `cpu_cost.room_composite_cpu_cost: 2` is set if using 2 CPU server
3. Confirm S3 credentials are correct in LiveKit server config
4. Check LiveKit server logs for egress errors

### Build Errors

If you encounter build errors:

1. Clear Next.js cache: `rm -rf .next`
2. Reinstall dependencies: `rm -rf node_modules && npm install`
3. Verify TypeScript errors: `npx tsc --noEmit`
4. Check for React key props in mapped components

## License

MIT

## Support

For issues and questions, please open an issue on the repository.
