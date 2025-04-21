# Bali Trip Planner

An interactive web application for planning trips to Bali using Next.js and Mapbox GL JS.

## Features

- Interactive map centered on Bali
- Add pins for places you want to visit with custom markers
- View a list of all added places with coordinates
- Calculate both direct and driving distances between locations
- Save your trip plan using browser localStorage
- Responsive design for mobile and desktop

## Getting Started

### Prerequisites

- Node.js 16.8.0 or later
- A Mapbox access token (get one for free at [mapbox.com](https://mapbox.com))

### Installation

1. Clone the repository:
```
git clone <repository-url>
cd bali-trip-planner
```

2. Install dependencies:
```
npm install
```

3. Add your Mapbox access token:
Open `src/config/mapbox.ts` and replace the placeholder with your Mapbox access token.

4. Run the development server:
```
npm run dev
```

5. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Usage

- Click anywhere on the map to add a pin
- Enter a name for the location when prompted
- View all your saved locations in the sidebar
- Distance calculations will automatically appear when you have two or more locations
- Use the "Clear All Locations" button to reset your trip plan

## Technologies Used

- Next.js
- TypeScript
- Mapbox GL JS
- Turf.js for distance calculations
- Tailwind CSS

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
# trip-planner
