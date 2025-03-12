import Link from "next/link";

export default function Home() {
  return (
    <div className="max-w-4xl mx-auto">
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold">Welcome to Beats19182</h1>
        <p className="text-xl text-muted-foreground">
          Your self-hosted platform for managing and sharing audio files
        </p>
      </div>

      <div className="mt-12 grid gap-8 md:grid-cols-2">
        <div className="p-6 rounded-lg border">
          <h2 className="text-2xl font-semibold mb-4">For Creators</h2>
          <ul className="space-y-2">
            <li>✨ Upload and organize your audio files</li>
            <li>🏷️ Create custom tags for easy categorization</li>
            <li>📦 Bundle files into shareable packs</li>
            <li>🔄 Keep track of your file versions</li>
          </ul>
        </div>

        <div className="p-6 rounded-lg border">
          <h2 className="text-2xl font-semibold mb-4">Getting Started</h2>
          <div className="space-y-4">
            <p>Create an account or sign in to:</p>
            <ul className="space-y-2">
              <li>📤 Upload your first audio file</li>
              <li>🎵 Create your first pack</li>
              <li>🌐 Share with others</li>
            </ul>
            <Link
              href="/auth/signin"
              className="mt-4 inline-block px-6 py-3 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
            >
              Get Started →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
