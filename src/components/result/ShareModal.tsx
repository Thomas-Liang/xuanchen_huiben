import { Modal, Button, Select, Input, Space, message, Tabs, Typography, Alert } from 'antd';
import {
  ShareAltOutlined,
  CopyOutlined,
  LinkOutlined,
  LockOutlined,
  DownloadOutlined,
} from '@ant-design/icons';
import { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';

const { Text } = Typography;

interface ShareData {
  images: string[];
  prompt: string;
  model: string;
  params: Record<string, unknown>;
}

interface ShareModalProps {
  visible: boolean;
  onClose: () => void;
  shareData: ShareData;
}

type ExpireOption = '1day' | '7day' | 'forever';

export function ShareModal({ visible, onClose, shareData }: ShareModalProps) {
  const [expireOption, setExpireOption] = useState<ExpireOption>('7day');
  const [password, setPassword] = useState('');
  const [shareLink, setShareLink] = useState('');
  const [generating, setGenerating] = useState(false);
  const [activeTab, setActiveTab] = useState('link');

  useEffect(() => {
    if (!visible) {
      setShareLink('');
      setPassword('');
      setExpireOption('7day');
    }
  }, [visible]);

  const generateShareLink = async () => {
    setGenerating(true);
    try {
      const shareId = `share_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
      const expiresAt =
        expireOption === 'forever'
          ? null
          : new Date(
              Date.now() + (expireOption === '1day' ? 1 : 7) * 24 * 60 * 60 * 1000
            ).toISOString();

      const localIp = await invoke<string>('get_local_ip');
      const link = `http://${localIp}:8888/share/${shareId}`;
      setShareLink(link);

      await invoke('create_share', {
        share: {
          id: shareId,
          data: {
            version: '1.0',
            type: 'image_share',
            created_at: new Date().toISOString(),
            expires_at: expiresAt,
            password_protected: !!password,
            metadata: {
              prompt: shareData.prompt,
              model: shareData.model,
              params: shareData.params,
            },
            images: shareData.images,
          },
          password: password || null,
          expires_at: expiresAt,
        },
      });

      message.success('分享链接已生成');
    } catch (error) {
      console.error('生成分享链接失败:', error);
      message.error(`生成分享链接失败: ${error}`);
    } finally {
      setGenerating(false);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(shareLink);
    message.success('链接已复制到剪贴板');
  };

  const downloadAsHtml = async () => {
    try {
      const htmlContent = await invoke<string>('generate_share_html', {
        data: {
          version: '1.0',
          type: 'image_share',
          created_at: new Date().toISOString(),
          expires_at:
            expireOption === 'forever'
              ? null
              : new Date(
                  Date.now() + (expireOption === '1day' ? 1 : 7) * 24 * 60 * 60 * 1000
                ).toISOString(),
          password_protected: !!password,
          metadata: {
            prompt: shareData.prompt,
            model: shareData.model,
            params: shareData.params,
          },
          images: shareData.images,
        },
        password: password || null,
      });

      const { save } = await import('@tauri-apps/plugin-dialog');
      const filePath = await save({
        defaultPath: `share_${Date.now()}.html`,
        filters: [{ name: 'HTML', extensions: ['html'] }],
      });

      if (filePath) {
        await invoke('save_text_to_file', { content: htmlContent, filePath });
        message.success('HTML 文件已保存');
      }
    } catch (error) {
      console.error('保存 HTML 失败:', error);
      message.error('保存 HTML 文件失败');
    }
  };

  return (
    <Modal
      title={
        <Space>
          <ShareAltOutlined />
          分享图片
        </Space>
      }
      open={visible}
      onCancel={onClose}
      footer={null}
      width={500}
    >
      <Tabs
        activeKey={activeTab}
        onChange={setActiveTab}
        items={[
          {
            key: 'link',
            label: (
              <span>
                <LinkOutlined /> 链接分享
              </span>
            ),
          },
          {
            key: 'html',
            label: (
              <span>
                <CopyOutlined /> 本地 HTML
              </span>
            ),
          },
        ]}
      />

      {activeTab === 'link' && (
        <div className="space-y-4">
          <div>
            <Text strong>有效期</Text>
            <Select
              value={expireOption}
              onChange={setExpireOption}
              className="w-full mt-2"
              options={[
                { value: '1day', label: '1 天' },
                { value: '7day', label: '7 天' },
                { value: 'forever', label: '永久' },
              ]}
            />
          </div>

          <div>
            <Text strong>访问密码（可选）</Text>
            <Input.Password
              prefix={<LockOutlined />}
              placeholder="设置密码保护"
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="mt-2"
            />
          </div>

          {shareLink ? (
            <div className="space-y-3">
              <Alert message="分享链接已生成" type="success" showIcon />
              <Input.TextArea value={shareLink} readOnly rows={2} className="font-mono text-sm" />
              <Button type="primary" icon={<CopyOutlined />} onClick={copyToClipboard} block>
                复制链接
              </Button>
              <div className="flex flex-col items-center p-4 bg-gray-50 rounded-lg gap-2">
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(shareLink)}`}
                  alt="二维码"
                  className="w-[150px] h-[150px]"
                />
                <Text type="secondary" className="text-xs">
                  手机扫描二维码即可访问
                </Text>
              </div>
            </div>
          ) : (
            <Button
              type="primary"
              icon={<ShareAltOutlined />}
              onClick={generateShareLink}
              loading={generating}
              block
              size="large"
            >
              生成分享链接
            </Button>
          )}
        </div>
      )}

      {activeTab === 'html' && (
        <div className="space-y-4">
          <Alert
            message="本地 HTML 分享"
            description="将生成一个独立的 HTML 文件，无需网络即可在浏览器中查看。适合离线分享。"
            type="info"
            showIcon
          />

          <div className="space-y-3">
            <div>
              <Text strong>有效期</Text>
              <Select
                value={expireOption}
                onChange={setExpireOption}
                className="w-full mt-2"
                options={[
                  { value: '1day', label: '1 天' },
                  { value: '7day', label: '7 天' },
                  { value: 'forever', label: '永久' },
                ]}
              />
            </div>

            <div>
              <Text strong>访问密码（可选）</Text>
              <Input.Password
                prefix={<LockOutlined />}
                placeholder="设置密码保护"
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="mt-2"
              />
            </div>

            <Button
              type="primary"
              icon={<DownloadOutlined />}
              onClick={downloadAsHtml}
              block
              size="large"
            >
              下载 HTML 文件
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}

export default ShareModal;
