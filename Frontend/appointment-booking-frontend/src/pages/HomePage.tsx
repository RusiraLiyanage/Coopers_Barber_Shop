import { Button, Spin, Typography, message } from 'antd';
import { useEffect } from 'react';
import { SACard } from '../components/common';
import { getGenericErrorMessage } from '../lib/errors';
import { getServicesAction } from '../store/services/action';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import {
  selectActiveServices,
  selectServicesLoading,
} from '../store/services/selector';
import './HomePage.css';

interface HomePageProps {
  onMakeAppointment: () => void;
}

function getServiceEmoji(serviceName: string) {
  const normalizedName = serviceName.toLowerCase();

  if (normalizedName.includes('colour correction')) {
    return '🎨';
  }

  if (
    normalizedName.includes('color') ||
    normalizedName.includes('colour') ||
    normalizedName.includes('bleach')
  ) {
    return '🌈';
  }

  if (normalizedName.includes('beard') || normalizedName.includes('shave')) {
    return '🧔';
  }

  if (normalizedName.includes('styling') || normalizedName.includes('style')) {
    return '💈';
  }

  if (
    normalizedName.includes('conditioning') ||
    normalizedName.includes('treatment')
  ) {
    return '✨';
  }

  if (normalizedName.includes('consultation')) {
    return '📝';
  }

  if (normalizedName.includes('cut') || normalizedName.includes('trim')) {
    return '✂️';
  }

  return '💇';
}

const HomePage: React.FC<HomePageProps> = ({ onMakeAppointment }) => {
  const dispatch = useAppDispatch();
  const [messageApi, contextHolder] = message.useMessage();
  const services = useAppSelector(selectActiveServices);
  const servicesLoading = useAppSelector(selectServicesLoading);

  useEffect(() => {
    dispatch(getServicesAction())
      .unwrap()
      .catch((error: unknown) => {
        messageApi.error(getGenericErrorMessage('Load services', error));
      });
  }, [dispatch, messageApi]);

  return (
    <div className="home-page">
      {contextHolder}
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
            <Spin spinning={servicesLoading}>
              {services.length > 0 ? (
                <ul className="home-services-list">
                  {services.map((service) => (
                    <li key={service.id} className="home-services-list-item">
                      <span
                        className="home-services-list-emoji"
                        aria-hidden="true"
                      >
                        {getServiceEmoji(service.name)}
                      </span>
                      <span>{service.name}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <Typography.Text type="secondary">
                  Services will appear here once they are active.
                </Typography.Text>
              )}
            </Spin>
          </SACard>
        </div>

        <Button
          type="primary"
          size="large"
          className="home-appointment-action"
          onClick={onMakeAppointment}
        >
          Make your Appointment
        </Button>
      </div>
    </div>
  );
};

export default HomePage;
