import packageJson from "../../../package.json";

export function Footer() {
    return (
        <footer className="w-full py-6 text-center text-white/20 text-xs font-mono tracking-widest uppercase">
            <p>TravelRoots &copy; {new Date().getFullYear()} • v{packageJson.version}</p>
        </footer>
    );
}
