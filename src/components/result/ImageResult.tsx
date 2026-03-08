import { Row, Col, Image, Button, Typography, Tag, Alert, Space } from 'antd';
import { DownloadOutlined, PlayCircleOutlined, SettingOutlined } from '@ant-design/icons';
import type { ImageGenerationResult } from '../../types';

const { Title } = Typography;

interface ImageResultProps {
  generationResult: ImageGenerationResult | null;
  onSaveImage: (imageUrl: string) => Promise<void>;
  onOpenSettings: () => void;
  onGenerate: () => void;
  batchGenerating: boolean;
  batchProgress: any;
}

export function ImageResult({
  generationResult,
  onSaveImage,
  onOpenSettings,
  onGenerate,
  batchGenerating,
  batchProgress,
}: ImageResultProps) {
  if (!generationResult) return null;

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
                  src={img}
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
                <Button
                  type="link"
                  icon={<DownloadOutlined />}
                  onClick={() => onSaveImage(img)}
                  className="mt-2"
                >
                  保存到本地
                </Button>
              </Col>
            ))}
          </Row>
        </>
      ) : (
        <Alert message="生成失败" description={generationResult.error} type="error" showIcon />
      )}
    </div>
  );
}

export default ImageResult;
