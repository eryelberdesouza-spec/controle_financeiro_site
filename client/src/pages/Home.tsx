import { useState } from 'react';
import Layout from '@/components/Layout';
import Overview from '@/components/sections/Overview';
import Downloads from '@/components/sections/Downloads';
import Payments from '@/components/sections/Payments';
import Receivables from '@/components/sections/Receivables';
import Dashboard from '@/components/sections/Dashboard';
import Reports from '@/components/sections/Reports';
import Customization from '@/components/sections/Customization';
import FAQ from '@/components/sections/FAQ';

export default function Home() {
  const [activeSection, setActiveSection] = useState('overview');

  const renderSection = () => {
    switch (activeSection) {
      case 'overview':
        return <Overview />;
      case 'downloads':
        return <Downloads />;
      case 'payments':
        return <Payments />;
      case 'receivables':
        return <Receivables />;
      case 'dashboard':
        return <Dashboard />;
      case 'reports':
        return <Reports />;
      case 'customization':
        return <Customization />;
      case 'faq':
        return <FAQ />;
      default:
        return <Overview />;
    }
  };

  return (
    <Layout activeSection={activeSection} onSectionChange={setActiveSection}>
      {renderSection()}
    </Layout>
  );
}
