// src/pages/HomePage.tsx
import { Button, Card } from "antd";

interface HomePageProps {
  onRequireAuth?: () => void; // 👈 optional callback
}

const HomePage: React.FC<HomePageProps> = ({ onRequireAuth }) => {
  return (
    <div
      style={{
        height: "100vh",
        width: "100%",
        backgroundImage: "url('Coopers_barber_background.png')", // full path from public/
        backgroundSize: "cover", // ensures full width/height cover
        backgroundPosition: "center", // center the image
        backgroundRepeat: "no-repeat",
        backgroundAttachment: "fixed", // 👈 creates parallax scroll effect
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "white",
        textAlign: "center",
      }}
    >
      <div>
        <h1 style={{ fontSize: "4rem", fontWeight: "bold", color: "white" }}>
          Cooper's Barber Shop
        </h1>
        <p
          style={{
            fontSize: "2.25rem",
            marginBottom: "20px",
            color: "white",
            alignItems: "left",
          }}
        >
          We provide top-notch barber services tailored to your style.
        </p>
        <p
          style={{
            fontSize: "2.25rem",
            marginBottom: "20px",
            color: "white",
            alignItems: "left",
          }}
        >
          Book your appointments with ease.
        </p>
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            marginTop: "50px",
          }}
        >
          <Card
            title="Our Services"
            bordered={false}
            style={{
              width: 400,
              borderRadius: "16px",
              boxShadow: "0 8px 20px rgba(0, 0, 0, 0.15)",
              background: "linear-gradient(135deg, #f9f9f9, #ffffff)",
            }}
            headStyle={{
              textAlign: "center",
              fontSize: "1.8rem",
              fontWeight: "bold",
              color: "#333",
            }}
          >
            <ul
              style={{
                listStyle: "none",
                padding: 0,
                margin: 0,
                textAlign: "left",
              }}
            >
              <li
                style={{
                  fontSize: "1.2rem",
                  marginBottom: "10px",
                  color: "#555",
                }}
              >
                💈 Hair Cut
              </li>
              <li
                style={{
                  fontSize: "1.2rem",
                  marginBottom: "10px",
                  color: "#555",
                }}
              >
                💇 Hair Styling
              </li>
              <li
                style={{
                  fontSize: "1.2rem",
                  marginBottom: "10px",
                  color: "#555",
                }}
              >
                🎨 Hair Coloring
              </li>
              <li
                style={{
                  fontSize: "1.2rem",
                  marginBottom: "10px",
                  color: "#555",
                }}
              >
                🧑‍💼 Consultation
              </li>
              <li
                style={{
                  fontSize: "1.2rem",
                  marginBottom: "10px",
                  color: "#555",
                }}
              >
                💆 Deep Conditioning Treatment
              </li>
            </ul>
          </Card>
        </div>
        <br />
        <br />
        <Button
          type="primary"
          size="large"
          onClick={onRequireAuth} // 👈 triggers modal
        >
          Make your Appointment
        </Button>
      </div>
    </div>
  );
};

export default HomePage;
