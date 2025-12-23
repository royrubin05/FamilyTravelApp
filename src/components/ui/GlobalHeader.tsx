import Link from "next/link";
import Image from "next/image";

interface GlobalHeaderProps {
    children?: React.ReactNode;
    className?: string;
}

export function GlobalHeader({ children, className = "" }: GlobalHeaderProps) {
    return (
        <header className={`flex justify-between items-center mb-8 max-w-4xl mx-auto relative z-40 ${className}`}>
            <Link href="/" className="hover:opacity-80 transition-opacity">
                <div className="relative h-12 w-48">
                    <Image
                        src="/images/travelroots-logo.png"
                        alt="TravelRoots"
                        fill
                        className="object-contain object-left"
                        priority
                    />
                </div>
            </Link>

            <div className="flex items-center gap-4">
                {children}
            </div>
        </header>
    );
}
