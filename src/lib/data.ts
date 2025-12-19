export const TRIPS = [
    {
        id: "london",
        destination: "LONDON",
        dates: "Oct 12 - Oct 27",
        image: "https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?q=80&w=1974&auto=format&fit=crop", // Moody London Street
        travelers: [
            {
                id: "dad",
                name: "Dad",
                role: "Organizer",
                card: {
                    type: "flight",
                    title: "LHR → JFK",
                    subtitle: "British Airways BA123",
                    detail1: "Term 5",
                    detail2: "Gate B34",
                    status: "Boarding 10:40 AM",
                    qrCode: true
                }
            },
            {
                id: "mom",
                name: "Mom",
                role: "Traveler",
                card: {
                    type: "hotel",
                    title: "The Ritz London",
                    subtitle: "Executive Suite",
                    detail1: "Check-in",
                    detail2: "3:00 PM",
                    status: "Confirmed",
                    qrCode: false
                }
            },
            {
                id: "kids",
                name: "Kids",
                role: "Travelers",
                card: {
                    type: "activity",
                    title: "Harry Potter World",
                    subtitle: "Studio Tour",
                    detail1: "Entry",
                    detail2: "1:00 PM",
                    status: "Tickets Ready",
                    qrCode: true
                }
            }
        ]
    },
    {
        id: "aspen",
        destination: "ASPEN",
        dates: "Dec 20 - Dec 27",
        image: "https://images.unsplash.com/photo-1551524559-8af4e66a3236?q=80&w=1974&auto=format&fit=crop", // Snowy Mountains
        travelers: [
            {
                id: "mom",
                name: "Mom",
                role: "Relaxing",
                card: null
            },
            {
                id: "dad",
                name: "Dad",
                role: "Hiking",
                card: null
            }
        ]
    },
    {
        id: "paris",
        destination: "PARIS",
        dates: "Spring 2025",
        image: "https://images.unsplash.com/photo-1502602898657-3e91760cbb34?q=80&w=1974&auto=format&fit=crop", // Eiffel Tower
        travelers: [
            {
                id: "dad",
                name: "Dad",
                role: "Skier",
                card: null
            },
            {
                id: "kids",
                name: "Kids",
                role: "Ski School",
                card: null
            }
        ]
    }
];
