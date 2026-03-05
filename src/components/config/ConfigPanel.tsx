import { Button, Modal, Input, Divider, Typography } from 'antd';
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

export function ConfigPanel({
  visible,
  onClose,
  apiConfig,
  setApiConfig,
  onSave,
  onTestApi,
  testingApi,
}: ConfigPanelProps) {
  return (
    <Modal title="API配置" open={visible} onCancel={onClose} onOk={onSave} okText="保存">
      <div className="py-4">
        <Divider className="text-indigo-500">Seeddream API</Divider>
        <div className="mb-4">
          <Text strong className="block mb-1">
            Base URL:
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
          />
        </div>
        <div className="mb-4">
          <Text strong className="block mb-1">
            API Key:
          </Text>
          <Input.Password
            value={apiConfig.seedream.apiKey}
            onChange={e =>
              setApiConfig({
                ...apiConfig,
                seedream: { ...apiConfig.seedream, apiKey: e.target.value },
              })
            }
            placeholder="请输入API Key"
          />
          <Button
            type="link"
            onClick={() => onTestApi('seedream')}
            loading={testingApi === 'seedream'}
            className="p-0 mt-1"
          >
            测试连接
          </Button>
        </div>

        <Divider className="text-violet-500">Banana 2 API</Divider>
        <div className="mb-4">
          <Text strong className="block mb-1">
            Base URL:
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
          />
        </div>
        <div>
          <Text strong className="block mb-1">
            API Key:
          </Text>
          <Input.Password
            value={apiConfig.bananaPro.apiKey}
            onChange={e =>
              setApiConfig({
                ...apiConfig,
                bananaPro: { ...apiConfig.bananaPro, apiKey: e.target.value },
              })
            }
            placeholder="请输入API Key"
          />
          <Button
            type="link"
            onClick={() => onTestApi('banana_pro')}
            loading={testingApi === 'banana_pro'}
            className="p-0 mt-1"
          >
            测试连接
          </Button>
        </div>
      </div>
    </Modal>
  );
}

export default ConfigPanel;
