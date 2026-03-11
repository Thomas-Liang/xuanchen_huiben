import { Button, Modal, Input, Divider, Typography, Space, Tag, Tooltip } from 'antd';
import {
  InfoCircleOutlined,
  CheckCircleOutlined,
  KeyOutlined,
  ApiOutlined,
} from '@ant-design/icons';
import type { APIConfig } from '../../types';

const { Text, Title } = Typography;

interface ConfigPanelProps {
  visible: boolean;
  onClose: () => void;
  apiConfig: APIConfig;
  setApiConfig: (config: APIConfig) => void;
  onSave: () => void;
  onTestApi: (model: 'seedream' | 'banana_pro') => void;
  testingApi: 'seedream' | 'banana_pro' | null;
}

export function ConfigPanel({
  visible,
  onClose,
  apiConfig,
  setApiConfig,
  onSave,
  onTestApi,
  testingApi,
}: ConfigPanelProps) {
  const isSeedreamConfigured = apiConfig.seedream.baseUrl && apiConfig.seedream.apiKey;
  const isBananaProConfigured = apiConfig.bananaPro.baseUrl && apiConfig.bananaPro.apiKey;

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
      okText="保存配置"
      width={600}
    >
      <div className="py-4">
        <Divider style={{ marginTop: 24 }}>
          <Space>
            <span className="text-indigo-500">Seedream API</span>
            <Tag color={isSeedreamConfigured ? 'success' : 'default'}>
              {isSeedreamConfigured ? '已配置' : '未配置'}
            </Tag>
          </Space>
        </Divider>

        <div className="mb-4">
          <Text strong className="block mb-1">
            <Tooltip title="API 服务地址">
              <span>
                Base URL <InfoCircleOutlined style={{ color: '#999', fontSize: 12 }} />
              </span>
            </Tooltip>
          </Text>
          <Input
            value={apiConfig.seedream.baseUrl}
            onChange={e =>
              setApiConfig({
                ...apiConfig,
                seedream: { ...apiConfig.seedream, baseUrl: e.target.value },
              })
            }
            placeholder="https://api.zhongzhuan.chat"
            suffix={
              isSeedreamConfigured ? <CheckCircleOutlined style={{ color: '#52c41a' }} /> : null
            }
          />
        </div>

        <div className="mb-4">
          <Text strong className="block mb-1">
            <Tooltip title="用于身份验证的密钥">
              <span>
                API Key <InfoCircleOutlined style={{ color: '#999', fontSize: 12 }} />
              </span>
            </Tooltip>
          </Text>
          <Input.Password
            value={apiConfig.seedream.apiKey}
            onChange={e =>
              setApiConfig({
                ...apiConfig,
                seedream: { ...apiConfig.seedream, apiKey: e.target.value },
              })
            }
            placeholder="请输入 API Key"
          />
          <div className="mt-2">
            <Button
              type={isSeedreamConfigured ? 'default' : 'primary'}
              onClick={() => onTestApi('seedream')}
              loading={testingApi === 'seedream'}
              icon={<KeyOutlined />}
              size="small"
            >
              测试连接
            </Button>
            {isSeedreamConfigured && (
              <Text type="success" className="ml-2" style={{ fontSize: 12 }}>
                <CheckCircleOutlined /> 配置已完成
              </Text>
            )}
          </div>
        </div>

        <div className="mb-4 p-3 bg-gray-50 dark:bg-gray-800 rounded">
          <Text type="secondary" style={{ fontSize: 12 }}>
            <InfoCircleOutlined className="mr-1" />
            Seedream 支持 1K/2K/4K 超清图片、组图功能、水印控制，适合高质量商业图片生成
          </Text>
        </div>

        <Divider style={{ marginTop: 24 }}>
          <Space>
            <span className="text-violet-500">Banana 2 API</span>
            <Tag color={isBananaProConfigured ? 'success' : 'default'}>
              {isBananaProConfigured ? '已配置' : '未配置'}
            </Tag>
          </Space>
        </Divider>

        <div className="mb-4">
          <Text strong className="block mb-1">
            <Tooltip title="API 服务地址">
              <span>
                Base URL <InfoCircleOutlined style={{ color: '#999', fontSize: 12 }} />
              </span>
            </Tooltip>
          </Text>
          <Input
            value={apiConfig.bananaPro.baseUrl}
            onChange={e =>
              setApiConfig({
                ...apiConfig,
                bananaPro: { ...apiConfig.bananaPro, baseUrl: e.target.value },
              })
            }
            placeholder="https://api.bananaprostudio.com"
            suffix={
              isBananaProConfigured ? <CheckCircleOutlined style={{ color: '#52c41a' }} /> : null
            }
          />
        </div>

        <div className="mb-4">
          <Text strong className="block mb-1">
            <Tooltip title="用于身份验证的密钥">
              <span>
                API Key <InfoCircleOutlined style={{ color: '#999', fontSize: 12 }} />
              </span>
            </Tooltip>
          </Text>
          <Input.Password
            value={apiConfig.bananaPro.apiKey}
            onChange={e =>
              setApiConfig({
                ...apiConfig,
                bananaPro: { ...apiConfig.bananaPro, apiKey: e.target.value },
              })
            }
            placeholder="请输入 API Key"
          />
          <div className="mt-2">
            <Button
              type={isBananaProConfigured ? 'default' : 'primary'}
              onClick={() => onTestApi('banana_pro')}
              loading={testingApi === 'banana_pro'}
              icon={<KeyOutlined />}
              size="small"
            >
              测试连接
            </Button>
            {isBananaProConfigured && (
              <Text type="success" className="ml-2" style={{ fontSize: 12 }}>
                <CheckCircleOutlined /> 配置已完成
              </Text>
            )}
          </div>
        </div>

        <div className="mb-4 p-3 bg-gray-50 dark:bg-gray-800 rounded">
          <Text type="secondary" style={{ fontSize: 12 }}>
            <InfoCircleOutlined className="mr-1" />
            Banana 2 支持多种比例和分辨率的图片生成，支持角色融图，适合创意图片生成
          </Text>
        </div>

        <Divider />

        <div className="mt-4">
          <Title level={5} style={{ marginBottom: 8 }}>
            使用建议
          </Title>
          <ul style={{ paddingLeft: 20, margin: 0, fontSize: 13, color: '#666' }}>
            <li>建议至少配置一个 API 以便正常使用</li>
            <li>点击"测试连接"可验证 API 是否可用</li>
            <li>API Key 会本地加密存储，请放心使用</li>
            <li>如遇到 API 异常，可查看统计页面分析调用情况</li>
          </ul>
        </div>
      </div>
    </Modal>
  );
}

export default ConfigPanel;
