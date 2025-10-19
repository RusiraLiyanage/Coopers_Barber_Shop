import { Button, Checkbox, Form, Input, Modal, Tabs, message } from "antd";
import { useEffect, useState } from "react";

interface UserAuthModalProps {
  open: boolean;
  onClose: () => void;
  onAuthSuccess: () => void; // 👈 new prop
}

type FieldType = {
  username?: string;
  password?: string;
  remember?: string;
};

const UserAuthModal: React.FC<UserAuthModalProps> = ({
  open,
  onClose,
  onAuthSuccess,
}) => {
  const [confirmLoading, setConfirmLoading] = useState(false);
  const [messageApi, contextHolder] = message.useMessage();

  // 👇 create form instances for both login and register
  const [loginForm] = Form.useForm();
  const [registerForm] = Form.useForm();

  // 👇 reset all forms when modal opens
  useEffect(() => {
    if (open) {
      loginForm.resetFields();
      registerForm.resetFields();
    }
  }, [open, loginForm, registerForm]); // the page will be recreated when these values got changed.

  const handleOk = (): Promise<void> => {
    setConfirmLoading(true);
    return new Promise((resolve) => {
      setTimeout(() => {
        onClose();
        setConfirmLoading(false);
        resolve(); // ✅ tells await it's done
      }, 2000);
    });
  };

  return (
    <>
      {contextHolder}
      <Modal
        title=""
        open={open}
        confirmLoading={confirmLoading}
        onOk={handleOk}
        onCancel={onClose}
        style={{ top: 150 }}
        footer={[
          <Button key="cancel" onClick={onClose}>
            Cancel
          </Button>,
        ]}
        width={{
          xs: "36%", // Mobile
          sm: "36%", // Small tablets
          md: "36%", // Tablets
          lg: "36%", // Small desktop
          xl: "36%", // Large desktop
          xxl: "37%", // Extra-large screens
        }}
      >
        {/* Replace this with actual login/register forms later */}
        <center>
          <h1>Sign in or Sign up to continue</h1>
        </center>

        <div
          style={{ display: "flex", justifyContent: "center", marginTop: 20 }}
        >
          <Tabs
            defaultActiveKey="1"
            centered
            style={{ width: "100%", maxWidth: 400 }}
            items={[
              {
                key: "1",
                label: "Login",
                children: (
                  <div style={{ textAlign: "left", paddingTop: 5 }}>
                    <Form
                      name="Login Form"
                      form={loginForm}
                      labelCol={{ span: 8 }}
                      wrapperCol={{ span: 16 }}
                      style={{ maxWidth: 600 }}
                      initialValues={{ remember: true }}
                      onFinish={async (values) => {
                        console.log("Success:", values);
                        await handleOk(); // ✅ only runs if validation passes
                        messageApi.success({
                          content: "Successful Login!",
                          style: {
                            outlineColor: "#E6F7FF",
                            color: "#0050b3",
                            borderRadius: 8,
                            paddingBottom: 5,
                          },
                        }); // ✅ show after close
                        onAuthSuccess();
                      }}
                      onFinishFailed={(errorInfo) => {
                        console.log("Validation Failed:", errorInfo);
                        // handleOk() will NOT run here
                      }}
                      autoComplete="off"
                    >
                      <Form.Item<FieldType>
                        label="Username"
                        name="username"
                        rules={[
                          {
                            required: true,
                            message: "Please input your username!",
                          },
                        ]}
                      >
                        <Input />
                      </Form.Item>

                      <Form.Item<FieldType>
                        label="Password"
                        name="password"
                        rules={[
                          {
                            required: true,
                            message: "Please input your password!",
                          },
                        ]}
                      >
                        <Input.Password />
                      </Form.Item>

                      <Form.Item<FieldType>
                        name="remember"
                        valuePropName="checked"
                        label={null}
                      >
                        <Checkbox>Remember me</Checkbox>
                      </Form.Item>

                      <Form.Item label={null}>
                        <Button
                          type="primary"
                          htmlType="submit"
                          loading={confirmLoading}
                        >
                          Login
                        </Button>
                      </Form.Item>
                    </Form>
                  </div>
                ),
              },
              {
                key: "2",
                label: "Register",
                children: (
                  <div style={{ textAlign: "left", paddingTop: 5 }}>
                    <Form
                      name="Register Form"
                      form={registerForm}
                      labelCol={{ span: 8 }}
                      wrapperCol={{ span: 16 }}
                      style={{ maxWidth: 600 }}
                      initialValues={{ remember: true }}
                      onFinish={async (values) => {
                        console.log("Success:", values);
                        await handleOk(); // ✅ only runs if validation passes
                        messageApi.success("Successfully Registered!"); // ✅ show after close
                        onAuthSuccess();
                      }}
                      onFinishFailed={(errorInfo) => {
                        console.log("Validation Failed:", errorInfo);
                        // handleOk() will NOT run here
                      }}
                      autoComplete="off"
                    >
                      <Form.Item<FieldType>
                        label="Username"
                        name="username"
                        rules={[
                          {
                            required: true,
                            message: "Please input your username!",
                          },
                        ]}
                      >
                        <Input />
                      </Form.Item>

                      <Form.Item<FieldType>
                        label="Password"
                        name="password"
                        rules={[
                          {
                            required: true,
                            message: "Please input your password!",
                          },
                        ]}
                      >
                        <Input.Password />
                      </Form.Item>

                      <Form.Item<FieldType>
                        name="remember"
                        valuePropName="checked"
                        label={null}
                      >
                        <Checkbox>Remember me</Checkbox>
                      </Form.Item>

                      <Form.Item label={null}>
                        <Button
                          type="primary"
                          htmlType="submit"
                          loading={confirmLoading}
                        >
                          Sign Up
                        </Button>
                      </Form.Item>
                    </Form>
                  </div>
                ),
              },
            ]}
          />
        </div>
      </Modal>
    </>
  );
};

export default UserAuthModal;
