import { BrowserRouter, Routes, Route } from 'react-router-dom';

import LandingPage from './pages/LandingPage';
import CardRedirectPage from './pages/CardRedirectPage';
import WelcomeDiscoveryPage from './pages/WelcomeDiscoveryPage';
import VehicleInfoPage from './pages/VehicleInfoPage';
import RequestCarPage from './pages/RequestCarPage';
import PaymentPage from './pages/PaymentPage';
import StatusTrackingPage from './pages/StatusTrackingPage';
import AmenitiesDirectoryPage from './pages/AmenitiesDirectoryPage';
import AmenityDetailPage from './pages/AmenityDetailPage';
import NearbyPlacesPage from './pages/NearbyPlacesPage';
import TableReservationPage from './pages/TableReservationPage';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/v/:cardId" element={<CardRedirectPage />} />
        <Route path="/welcome/:cardId" element={<WelcomeDiscoveryPage />} />
        <Route path="/vehicle-info/:cardId" element={<VehicleInfoPage />} />
        <Route path="/request/:cardId" element={<RequestCarPage />} />
        <Route path="/confirm/:cardId" element={<RequestCarPage />} />
        <Route path="/payment/:cardId" element={<PaymentPage />} />
        <Route path="/status/:cardId" element={<StatusTrackingPage />} />
        <Route path="/amenities/:cardId" element={<AmenitiesDirectoryPage />} />
        <Route path="/amenity/:cardId/:amenityId" element={<AmenityDetailPage />} />
        <Route path="/services/:cardId" element={<AmenitiesDirectoryPage />} />
        <Route path="/nearby/:cardId" element={<NearbyPlacesPage />} />
        <Route path="/reservations/:cardId" element={<TableReservationPage />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
