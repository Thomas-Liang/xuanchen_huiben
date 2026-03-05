import { useState, useEffect } from 'react';
import {
  Table,
  Button,
  Space,
  Tag,
  Modal,
  Image,
  Typography,
  Empty,
  Spin,
  Popconfirm,
  Pagination,
  Row,
  Col,
  Descriptions,
} from 'antd';
import { DeleteOutlined, EyeOutlined, ClearOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { getHistory, deleteHistory, clearHistory } from '../../api';

const { Text } = Typography;

interface GenerationHistory {
  id: string;
  prompt: string;
  model: string;
  params: Record<string, unknown>;
  images: string[];
  characters: string[];
  status: string;
  created_at: string;
  updated_at: string;
}

interface HistoryListProps {
  visible: boolean;
  onClose: () => void;
}

export function HistoryList({ visible, onClose }: HistoryListProps) {
  const [history, setHistory] = useState<GenerationHistory[]>([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(10);
  const [detailVisible, setDetailVisible] = useState(false);
  const [selectedHistory, setSelectedHistory] = useState<GenerationHistory | null>(null);

  const loadHistory = async (page: number = 1) => {
    setLoading(true);
    try {
      console.log(
        '[HistoryList] Loading history, isTauri:',
        typeof window !== 'undefined' && '__TAURI__' in window
      );
      const result = await getHistory(page - 1, pageSize);
      console.log('[HistoryList] Loaded:', result);
      setHistory(result.items);
      setTotal(result.total);
      setCurrentPage(page);
    } catch (error) {
      console.error('加载历史记录失败:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (visible) {
      loadHistory();
    }
  }, [visible]);

  const handleDelete = async (id: string) => {
    try {
      await deleteHistory(id);
      loadHistory(currentPage);
    } catch (error) {
      console.error('删除失败:', error);
    }
  };

  const handleClear = async () => {
    try {
      await clearHistory();
      loadHistory();
    } catch (error) {
      console.error('清空失败:', error);
    }
  };

  const handleViewDetail = (record: GenerationHistory) => {
    setSelectedHistory(record);
    setDetailVisible(true);
  };

  const columns: ColumnsType<GenerationHistory> = [
    {
      title: '时间',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 180,
      render: (text: string) => new Date(text).toLocaleString('zh-CN'),
    },
    {
      title: '提示词',
      dataIndex: 'prompt',
      key: 'prompt',
      ellipsis: true,
      render: (text: string) => (
        <Text ellipsis style={{ maxWidth: 300 }}>
          {text}
        </Text>
      ),
    },
    {
      title: '模型',
      dataIndex: 'model',
      key: 'model',
      width: 100,
      render: (model: string) => (
        <Tag color={model === 'seedream' ? 'blue' : 'purple'}>
          {model === 'seedream' ? 'Seedream' : 'Banana Pro'}
        </Tag>
      ),
    },
    {
      title: '图片',
      dataIndex: 'images',
      key: 'images',
      width: 80,
      render: (images: string[]) => <Tag color="green">{images?.length || 0} 张</Tag>,
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 80,
      render: (status: string) => (
        <Tag color={status === 'completed' ? 'green' : status === 'failed' ? 'red' : 'orange'}>
          {status === 'completed' ? '成功' : status === 'failed' ? '失败' : '处理中'}
        </Tag>
      ),
    },
    {
      title: '操作',
      key: 'action',
      width: 120,
      render: (_, record) => (
        <Space>
          <Button type="text" icon={<EyeOutlined />} onClick={() => handleViewDetail(record)}>
            查看
          </Button>
          <Popconfirm
            title="确认删除"
            description="确定要删除这条记录吗？"
            onConfirm={() => handleDelete(record.id)}
            okText="确定"
            cancelText="取消"
          >
            <Button type="text" danger icon={<DeleteOutlined />}>
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <Modal
      title={
        <div className="flex items-center justify-between">
          <span>生成历史记录</span>
          <Popconfirm
            title="确认清空"
            description="确定要清空所有历史记录吗？此操作不可恢复。"
            onConfirm={handleClear}
            okText="确定"
            cancelText="取消"
          >
            <Button danger icon={<ClearOutlined />}>
              清空全部
            </Button>
          </Popconfirm>
        </div>
      }
      open={visible}
      onCancel={onClose}
      footer={null}
      width={1000}
    >
      <Spin spinning={loading}>
        {history.length > 0 ? (
          <>
            <Table
              columns={columns}
              dataSource={history}
              rowKey="id"
              pagination={false}
              size="small"
            />
            <div className="mt-4 flex justify-end">
              <Pagination
                current={currentPage}
                pageSize={pageSize}
                total={total}
                onChange={loadHistory}
                showSizeChanger={false}
              />
            </div>
          </>
        ) : (
          <Empty description="暂无历史记录" />
        )}
      </Spin>

      <Modal
        title="生成详情"
        open={detailVisible}
        onCancel={() => setDetailVisible(false)}
        footer={[
          <Button key="close" onClick={() => setDetailVisible(false)}>
            关闭
          </Button>,
        ]}
        width={800}
      >
        {selectedHistory && (
          <div>
            <Descriptions bordered column={2} size="small">
              <Descriptions.Item label="ID">{selectedHistory.id}</Descriptions.Item>
              <Descriptions.Item label="模型">
                <Tag color={selectedHistory.model === 'seedream' ? 'blue' : 'purple'}>
                  {selectedHistory.model === 'seedream' ? 'Seedream' : 'Banana Pro'}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="创建时间">
                {new Date(selectedHistory.created_at).toLocaleString('zh-CN')}
              </Descriptions.Item>
              <Descriptions.Item label="状态">
                <Tag color={selectedHistory.status === 'completed' ? 'green' : 'red'}>
                  {selectedHistory.status === 'completed' ? '成功' : '失败'}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="提示词" span={2}>
                {selectedHistory.prompt}
              </Descriptions.Item>
              <Descriptions.Item label="角色" span={2}>
                {selectedHistory.characters?.length > 0 ? (
                  <Space wrap>
                    {selectedHistory.characters.map((char: string) => (
                      <Tag key={char} color="blue">
                        @{char}
                      </Tag>
                    ))}
                  </Space>
                ) : (
                  <Text type="secondary">无</Text>
                )}
              </Descriptions.Item>
            </Descriptions>

            {selectedHistory.images && selectedHistory.images.length > 0 && (
              <div className="mt-4">
                <Text strong>生成的图片：</Text>
                <Row gutter={[16, 16]} className="mt-2">
                  {selectedHistory.images.map((img, idx) => (
                    <Col key={idx} span={12}>
                      <Image
                        src={img}
                        alt={`生成图片 ${idx + 1}`}
                        className="w-full rounded"
                        style={{ borderRadius: 8 }}
                      />
                    </Col>
                  ))}
                </Row>
              </div>
            )}
          </div>
        )}
      </Modal>
    </Modal>
  );
}

export default HistoryList;
