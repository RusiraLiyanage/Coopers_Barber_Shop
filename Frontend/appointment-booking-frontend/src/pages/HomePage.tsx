// src/pages/HomePage.tsx
import { Button } from "antd";
import { SACard } from "../components/common";
import "./HomePage.css";

interface HomePageProps {
  onMakeAppointment: () => void; // ✅ renamed to match new App.tsx
}

const HomePage: React.FC<HomePageProps> = ({ onMakeAppointment }) => {
  return (
    <div className="home-page">
      <div className="home-page-content">
        <h1 className="home-page-title">Cooper's Barber Shop</h1>
        <p className="home-page-copy">
          We provide top-notch barber services tailored to your style.
        </p>
        <p className="home-page-copy">Book your appointments with ease.</p>

        <div className="home-page-services">
          <SACard
            title="Our Services"
            bordered={false}
            radius={16}
            bodyPadding={24}
            className="home-services-card"
          >
            <ul className="home-services-list">
              {[
                "💈 Hair Cut",
                "💇 Hair Styling",
                "🎨 Hair Coloring",
                "🧑‍💼 Consultation",
                "💆 Deep Conditioning Treatment",
              ].map((service, index) => (
                <li key={index} className="home-services-list-item">
                  {service}
                </li>
              ))}
            </ul>
          </SACard>
        </div>

        <Button
          type="primary"
          size="large"
          className="home-appointment-action"
          onClick={onMakeAppointment} // ✅ uses new prop name
        >
          Make your Appointment
        </Button>
      </div>
    </div>
  );
};

export default HomePage;
