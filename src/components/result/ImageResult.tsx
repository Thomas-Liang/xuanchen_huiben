import { Row, Col, Image, Button, Typography, Tag, Alert, Space } from 'antd';
import {
  DownloadOutlined,
  PlayCircleOutlined,
  SettingOutlined,
  ShareAltOutlined,
} from '@ant-design/icons';
import type { ImageGenerationResult } from '../../types';
import { useState } from 'react';
import { ShareModal } from './ShareModal';
import { convertFileSrc } from '@tauri-apps/api/core';

const getImageSrc = (img: string) => {
  console.log('ImageResult img:', img);
  if (img.startsWith('data:')) {
    return img;
  }
  const src = convertFileSrc(img);
  console.log('Converted src:', src);
  return src;
};

const { Title } = Typography;

interface ImageResultProps {
  generationResult: ImageGenerationResult | null;
  onSaveImage: (imageUrl: string) => Promise<void>;
  onOpenSettings: () => void;
  onGenerate: () => void;
  batchGenerating: boolean;
  batchProgress: any;
  prompt?: string;
  model?: string;
  params?: Record<string, unknown>;
}

export function ImageResult({
  generationResult,
  onSaveImage,
  onOpenSettings,
  onGenerate,
  batchGenerating,
  batchProgress,
  prompt = '',
  model = 'seedream',
  params = {},
}: ImageResultProps) {
  const [shareModalVisible, setShareModalVisible] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  if (!generationResult) return null;

  const openShareModal = (imageUrl?: string) => {
    setSelectedImage(imageUrl || null);
    setShareModalVisible(true);
  };

  const shareData = {
    images: selectedImage ? [selectedImage] : generationResult.images,
    prompt,
    model,
    params,
  };

  return (
    <div className="mt-4">
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center gap-2">
          <Title level={5} className="!mb-0">
            生成结果
          </Title>
          {generationResult.success ? <Tag color="green">成功</Tag> : <Tag color="red">失败</Tag>}
        </div>
        <Space>
          <Button size="small" icon={<ShareAltOutlined />} onClick={() => openShareModal()}>
            分享全部
          </Button>
          <Button size="small" icon={<SettingOutlined />} onClick={onOpenSettings}>
            生成设置
          </Button>
          <Button
            type="primary"
            size="small"
            icon={<PlayCircleOutlined />}
            loading={batchGenerating}
            onClick={onGenerate}
            className="bg-gradient-to-r from-indigo-500 to-violet-500 border-none"
          >
            {batchGenerating
              ? `生成中 (${batchProgress?.current}/${batchProgress?.total})`
              : '全部生图'}
          </Button>
        </Space>
      </div>

      {generationResult.success ? (
        <>
          {generationResult.notice && (
            <Alert
              message="已自动处理请求异常"
              description={generationResult.notice}
              type="warning"
              showIcon
              className="mb-3"
            />
          )}
          <Row gutter={16}>
            {generationResult.images.map((img, idx) => (
              <Col key={`gen-img-${idx}`} span={12}>
                <Image
                  src={getImageSrc(img)}
                  alt={`生成图片 ${idx + 1}`}
                  className="w-full rounded-lg"
                  preview={{
                    mask: (
                      <div className="text-sm">
                        <DownloadOutlined className="mr-1" />
                        点击放大
                      </div>
                    ),
                  }}
                />
                <Space className="mt-2">
                  <Button type="link" icon={<DownloadOutlined />} onClick={() => onSaveImage(img)}>
                    保存
                  </Button>
                  <Button
                    type="link"
                    icon={<ShareAltOutlined />}
                    onClick={() => openShareModal(img)}
                  >
                    分享
                  </Button>
                </Space>
              </Col>
            ))}
          </Row>
        </>
      ) : (
        <Alert message="生成失败" description={generationResult.error} type="error" showIcon />
      )}

      <ShareModal
        visible={shareModalVisible}
        onClose={() => setShareModalVisible(false)}
        shareData={shareData}
      />
    </div>
  );
}

export default ImageResult;
