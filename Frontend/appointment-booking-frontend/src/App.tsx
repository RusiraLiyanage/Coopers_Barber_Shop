// src/App.tsx
import { useState } from "react";
import { Layout } from "antd";
import HeaderNav from "./components/HeaderNav";
import Home from "./pages/HomePage";
import UserAuthModal from "./Models/userAuth";

const { Content, Footer } = Layout;

function App() {
  // modal state lives here globally
  const [openUserAuth, setOpenUserAuth] = useState(false);

  return (
    <Layout style={{ minHeight: "100vh" }}>
      <HeaderNav />
      <Content>
        {/* pass down trigger for auth modal */}
        <Home onRequireAuth={() => setOpenUserAuth(true)} />
      </Content>
      <Footer style={{ textAlign: "center" }}>
        ©2025 Cooper's Barber Shop | All Rights Reserved
      </Footer>

      {/* keep modal globally mounted */}
      <UserAuthModal
        open={openUserAuth}
        onClose={() => setOpenUserAuth(false)}
      />
    </Layout>
  );
}

export default App;
