“Slack Clone MVP
You are an expert in TypeScript, Next.js App Router, React, and Tailwind. Follow @Next.js docs for Data Fetching, Rendering, and Routing.

Your job is to create a Slack-like team communication application with the following specific features:
	1.	User Authentication and Organization Management
	•	Implement user sign-up and sign-in flows, using either an existing authentication system or a new one (e.g., Firebase Auth, NextAuth, or a custom solution).
	•	Support multiple organizations (teams) so users can be members of different workspaces.
	•	Provide an intuitive workspace selection screen or dropdown if users belong to multiple organizations.
	2.	Channel-Based Real-Time Messaging
	•	Create public and private channels within each workspace.
	•	Implement a channel list with clear separation for public vs. private channels.
	•	Use a real-time database, socket-based solution, or an existing messaging API from the codebase to enable live updates.
	•	Display unread message counts and highlight active channels.
	3.	Direct Messages (DMs) and Group DMs
	•	Allow users to start direct 1:1 conversations or multi-person group DMs.
	•	Show a distinct UI for private conversations, separate from channels.
	•	Support push notifications or in-app notifications when a new DM arrives.
	4.	Threaded Conversations
	•	Implement threaded replies within any channel message.
	•	Display a concise thread view or a side panel for threaded responses.
	•	Ensure the main channel view remains uncluttered, showing only top-level messages.
	5.	File Uploads and Attachments
	•	Integrate an upload feature for files and images in both channels and DMs.
	•	Display attachments with previews where applicable (images, PDFs, etc.).
	•	Ensure file uploads are secure and properly stored (e.g., using Firebase Storage, AWS S3, or another existing file storage setup).
	6.	User Mentions and Notifications
	•	Implement @mention functionality so that users can be tagged by username.
	•	Display a highlighted style for mentions to catch user attention.
	•	Offer optional in-app or browser notifications when a user is mentioned.
	7.	Search Functionality
	•	Provide a search bar to look up messages, channels, or users.
	•	Implement keyword-based search for both channel messages and DMs.
	•	Display results with context, and allow quick navigation to the relevant message or channel.
	8.	Sidebar and Workspace Navigation
	•	Design a sidebar layout with a responsive approach to collapse/expand on mobile.
	•	Show a list of all channels, direct messages, and threads in the sidebar, along with a toggle for collapsed mode.
	•	Include quick links for “All DMs,” “All Threads,” and “Starred” or “Pinned” channels/messages.
	9.	Channel and Conversation Management
	•	Let users create, rename, or archive channels.
	•	Provide an option to pin important messages within a channel.
	•	Implement user role management (e.g., Owner, Admin, Member) for channel and workspace settings.
	10.	Robust Error Handling and Loading States
	•	Display friendly error messages for network issues or API errors (e.g., “Unable to load channel messages”).
	•	Use skeleton loaders or spinners while fetching messages or channel info.
	•	Provide retry mechanisms where appropriate (e.g., if message sending fails).
	11.	User Profile and Settings
	•	Allow users to update their display name, profile picture, and status.
	•	Implement workspace-specific profile settings (e.g., default channels, notification preferences).
	•	Provide a dedicated page or modal for general account settings.
	12.	Responsive and Accessible UI
	•	Ensure the layout is optimized for mobile, tablet, and desktop views.
	•	Use Tailwind CSS for consistency in styling and ease of customization.
	•	Follow accessibility best practices (ARIA labels, keyboard navigation, color contrast).
	13.	Integration with Existing Codebase
	•	Use any existing configuration (e.g., Firebase, real-time services, or other APIs) provided in the codebase.
	•	Transform or replace legacy code to accommodate the Slack-like channels, DMs, and real-time messaging features.
	•	Adhere to the established folder structure and naming conventions where possible.
	14.	Next.js App Router and Data Fetching
	•	Implement server components, client components, or a hybrid approach as guided by Next.js App Router best practices.
	•	Use SSR or static generation where beneficial (e.g., server-rendering the initial channel list).
	•	Ensure routes for authentication, workspace selection, channels, DMs, and user settings are clearly defined.
	15.	TypeScript and Tailwind Best Practices
	•	Maintain strict type safety with TypeScript, defining clear types for messages, channels, users, and other entities.
	•	Create reusable components with well-defined props and return types.
	•	Leverage Tailwind’s utility classes for a maintainable design system.

Remember to handle authentication, real-time messaging, file attachments, and workspace/channel management in a cohesive manner. The final application should closely mimic the core workflow of Slack—organizing teams, channels, and direct messages—while maintaining best practices in TypeScript, Next.js App Router, React, and Tailwind. Create any necessary UI components (e.g., channel list, message threads, file upload UI) to deliver a seamless user experience.