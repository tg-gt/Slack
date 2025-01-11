# Modern Slack Clone

A full-featured Slack clone built with Next.js 14, TypeScript, Tailwind CSS, and Firebase. This application provides real-time team communication with channels, direct messages, and file sharing capabilities.

## Features

- 🔐 **Authentication & Organizations**
  - Google authentication
  - Multi-workspace support
  - Workspace management and switching

- 💬 **Real-time Messaging**
  - Public and private channels
  - Direct messages
  - Threaded conversations
  - Real-time updates using Firebase
  - Message editing and deletion
  - File attachments and previews

- 🎨 **Modern UI**
  - Responsive design
  - Dark/light mode support
  - Loading states and animations
  - Mobile-friendly layout
  - Tailwind CSS styling

- 🛠 **Technical Features**
  - Next.js 14 App Router
  - TypeScript for type safety
  - Firebase Authentication
  - Firestore real-time database
  - Firebase Storage for files
  - Server and client components
  - Context-based state management

## Tech Stack

- **Frontend**: Next.js 14, React, TypeScript
- **Styling**: Tailwind CSS, Framer Motion
- **Backend**: Firebase (Auth, Firestore, Storage)
- **State Management**: React Context
- **Date Handling**: date-fns
- **Icons**: Lucide React

## Getting Started

1. Clone the repository:
```bash
git clone https://github.com/yourusername/slack-clone.git
cd slack-clone
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env.local` file with your Firebase config:
```
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_auth_domain
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_storage_bucket
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
```

4. Run the development server:
```bash
npm run dev
```

5. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Project Structure

```
src/
├── app/                 # Next.js app router pages
├── components/          # React components
│   ├── attachments/    # File attachment components
│   ├── channels/      # Channel-related components
│   ├── messages/      # Message components
│   ├── ui/           # Shared UI components
│   └── workspace/    # Workspace components
├── lib/                # Utilities and hooks
│   ├── contexts/     # React contexts
│   ├── firebase/     # Firebase configuration
│   ├── hooks/        # Custom React hooks
│   └── types/        # TypeScript types
└── styles/            # Global styles
```

## Key Features Implementation

### Authentication
- Google Sign-in integration
- Protected routes with middleware
- Persistent auth state

### Workspaces
- Create and manage workspaces
- Switch between different workspaces
- Member management

### Channels
- Create public/private channels
- Real-time message updates
- Channel member management

### Messages
- Real-time messaging
- File attachments
- Message threading
- Mentions and notifications

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
