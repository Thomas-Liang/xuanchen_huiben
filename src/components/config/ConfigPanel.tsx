import {
  Button,
  Modal,
  Input,
  Typography,
  Space,
  Tag,
  Alert,
  Card,
  Row,
  Col,
  Switch,
  InputNumber,
} from 'antd';
import {
  InfoCircleOutlined,
  CheckCircleOutlined,
  ApiOutlined,
  LinkOutlined,
} from '@ant-design/icons';
import type { APIConfig } from '../../types';

const { Text } = Typography;

interface ConfigPanelProps {
  visible: boolean;
  onClose: () => void;
  apiConfig: APIConfig;
  setApiConfig: (config: APIConfig) => void;
  onSave: () => void;
  onTestApi: (model: 'seedream' | 'banana_pro') => void;
  testingApi: 'seedream' | 'banana_pro' | null;
}

const ApiCard: React.FC<{
  title: string;
  baseUrl: string;
  apiKey: string;
  isConfigured: boolean;
  description: string;
  placeholderUrl: string;
  placeholderKey: string;
  testing: boolean;
  onBaseUrlChange: (value: string) => void;
  onApiKeyChange: (value: string) => void;
  onTest: () => void;
}> = ({
  title,
  baseUrl,
  apiKey,
  isConfigured,
  description,
  placeholderUrl,
  placeholderKey,
  testing,
  onBaseUrlChange,
  onApiKeyChange,
  onTest,
}) => (
  <Card
    size="small"
    title={
      <Space>
        <span>{title}</span>
        <Tag color={isConfigured ? 'success' : 'warning'}>{isConfigured ? '已配置' : '未配置'}</Tag>
      </Space>
    }
    extra={
      <Button
        type={isConfigured ? 'default' : 'primary'}
        size="small"
        onClick={onTest}
        loading={testing}
      >
        测试
      </Button>
    }
    style={{ marginBottom: 16 }}
  >
    <Row gutter={12}>
      <Col span={24}>
        <Text strong style={{ display: 'block', marginBottom: 4, fontSize: 12 }}>
          Base URL
        </Text>
        <Input
          value={baseUrl}
          onChange={e => onBaseUrlChange(e.target.value)}
          placeholder={placeholderUrl}
          suffix={isConfigured ? <CheckCircleOutlined style={{ color: '#52c41a' }} /> : null}
        />
      </Col>
      <Col span={24} style={{ marginTop: 12 }}>
        <Text strong style={{ display: 'block', marginBottom: 4, fontSize: 12 }}>
          API Key
        </Text>
        <Input.Password
          value={apiKey}
          onChange={e => onApiKeyChange(e.target.value)}
          placeholder={placeholderKey}
        />
      </Col>
    </Row>
    <Alert
      message={description}
      type="info"
      showIcon
      icon={<InfoCircleOutlined />}
      style={{ marginTop: 12 }}
    />
  </Card>
);

export function ConfigPanel({
  visible,
  onClose,
  apiConfig,
  setApiConfig,
  onSave,
  onTestApi,
  testingApi,
}: ConfigPanelProps) {
  const isSeedreamConfigured = !!apiConfig.seedream.baseUrl && !!apiConfig.seedream.apiKey;
  const isBananaProConfigured = !!apiConfig.bananaPro.baseUrl && !!apiConfig.bananaPro.apiKey;

  return (
    <Modal
      title={
        <Space>
          <ApiOutlined />
          <span>API 配置</span>
        </Space>
      }
      open={visible}
      onCancel={onClose}
      onOk={onSave}
      okText="保存"
      width={520}
      footer={[
        <Button key="cancel" onClick={onClose}>
          取消
        </Button>,
        <Button key="save" type="primary" onClick={onSave}>
          保存配置
        </Button>,
      ]}
    >
      <div style={{ padding: '8px 0' }}>
        <ApiCard
          title="Seedream API"
          baseUrl={apiConfig.seedream.baseUrl}
          apiKey={apiConfig.seedream.apiKey}
          isConfigured={isSeedreamConfigured}
          description="支持 1K/2K/4K 超清图片、组图功能、水印控制，适合高质量商业图片生成"
          placeholderUrl="https://api.zhongzhuan.chat"
          placeholderKey="请输入 API Key"
          testing={testingApi === 'seedream'}
          onBaseUrlChange={value =>
            setApiConfig({
              ...apiConfig,
              seedream: { ...apiConfig.seedream, baseUrl: value },
            })
          }
          onApiKeyChange={value =>
            setApiConfig({
              ...apiConfig,
              seedream: { ...apiConfig.seedream, apiKey: value },
            })
          }
          onTest={() => onTestApi('seedream')}
        />

        <ApiCard
          title="Banana 2 API"
          baseUrl={apiConfig.bananaPro.baseUrl}
          apiKey={apiConfig.bananaPro.apiKey}
          isConfigured={isBananaProConfigured}
          description="支持多种比例和分辨率的图片生成，支持角色融图，适合创意图片生成"
          placeholderUrl="https://api.bananaprostudio.com"
          placeholderKey="请输入 API Key"
          testing={testingApi === 'banana_pro'}
          onBaseUrlChange={value =>
            setApiConfig({
              ...apiConfig,
              bananaPro: { ...apiConfig.bananaPro, baseUrl: value },
            })
          }
          onApiKeyChange={value =>
            setApiConfig({
              ...apiConfig,
              bananaPro: { ...apiConfig.bananaPro, apiKey: value },
            })
          }
          onTest={() => onTestApi('banana_pro')}
        />

        <Alert
          message={
            <Space>
              <CheckCircleOutlined style={{ color: '#52c41a' }} />
              <span>API Key 会本地加密存储，请放心使用</span>
            </Space>
          }
          type="success"
          showIcon
          style={{ marginTop: 8 }}
        />

        <Card
          size="small"
          title={
            <Space>
              <LinkOutlined />
              <span>Webhook 回调</span>
              <Tag color={apiConfig.webhook?.enabled ? 'success' : 'default'}>
                {apiConfig.webhook?.enabled ? '已启用' : '已禁用'}
              </Tag>
            </Space>
          }
          style={{ marginTop: 16 }}
        >
          <Row gutter={12}>
            <Col span={24}>
              <Space style={{ marginBottom: 12 }}>
                <Text strong style={{ fontSize: 12 }}>
                  启用 Webhook
                </Text>
                <Switch
                  checked={apiConfig.webhook?.enabled || false}
                  onChange={checked =>
                    setApiConfig({
                      ...apiConfig,
                      webhook: { ...apiConfig.webhook, enabled: checked },
                    })
                  }
                  size="small"
                />
              </Space>
            </Col>
            <Col span={24}>
              <Text strong style={{ display: 'block', marginBottom: 4, fontSize: 12 }}>
                回调 URL
              </Text>
              <Input
                value={apiConfig.webhook?.url || ''}
                onChange={e =>
                  setApiConfig({
                    ...apiConfig,
                    webhook: { ...apiConfig.webhook, url: e.target.value },
                  })
                }
                placeholder="https://your-webhook-url.com/callback"
                disabled={!apiConfig.webhook?.enabled}
              />
            </Col>
            <Col span={24} style={{ marginTop: 12 }}>
              <Text strong style={{ display: 'block', marginBottom: 4, fontSize: 12 }}>
                密钥 (可选)
              </Text>
              <Input.Password
                value={apiConfig.webhook?.secret || ''}
                onChange={e =>
                  setApiConfig({
                    ...apiConfig,
                    webhook: { ...apiConfig.webhook, secret: e.target.value },
                  })
                }
                placeholder="用于生成签名验证"
                disabled={!apiConfig.webhook?.enabled}
              />
            </Col>
            <Col span={12} style={{ marginTop: 12 }}>
              <Text strong style={{ display: 'block', marginBottom: 4, fontSize: 12 }}>
                重试次数
              </Text>
              <InputNumber
                min={0}
                max={10}
                value={apiConfig.webhook?.retryCount || 3}
                onChange={value =>
                  setApiConfig({
                    ...apiConfig,
                    webhook: { ...apiConfig.webhook, retryCount: value || 3 },
                  })
                }
                disabled={!apiConfig.webhook?.enabled}
                style={{ width: '100%' }}
              />
            </Col>
          </Row>
          <Alert
            message="生成图片完成后会自动 POST 回调到指定 URL，支持签名验证和失败重试"
            type="info"
            showIcon
            icon={<InfoCircleOutlined />}
            style={{ marginTop: 12 }}
          />
        </Card>
      </div>
    </Modal>
  );
}

export default ConfigPanel;
