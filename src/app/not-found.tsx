import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
      <h1 className="text-4xl font-bold">404</h1>
      <h2 className="text-2xl mt-2 mb-4">Page Not Found</h2>
      <p className="text-muted-foreground mb-6">
        The page you are looking for doesn't exist or has been moved.
      </p>
      <Link
        href="/"
        className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
      >
        Return Home
      </Link>
    </div>
  );
} 