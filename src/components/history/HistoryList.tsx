import { useState, useEffect, useMemo } from 'react';
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
  Input,
  Select,
  DatePicker,
  Radio,
} from 'antd';
import { DeleteOutlined, EyeOutlined, ClearOutlined, SearchOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { getHistory, deleteHistory, clearHistory } from '../../api';
import dayjs from 'dayjs';
import { motion, AnimatePresence } from 'framer-motion';

const { Text } = Typography;
const { RangePicker } = DatePicker;

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
  onApplyParams?: (params: any) => void;
}

type QuickFilter = 'all' | 'today' | 'week' | 'month';

export function HistoryList({ visible, onClose, onApplyParams }: HistoryListProps) {
  const [history, setHistory] = useState<GenerationHistory[]>([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(10);
  const [detailVisible, setDetailVisible] = useState(false);
  const [selectedHistory, setSelectedHistory] = useState<GenerationHistory | null>(null);

  const [searchKeyword, setSearchKeyword] = useState('');
  const [filterModel, setFilterModel] = useState<string | undefined>();
  const [dateRange, setDateRange] = useState<[dayjs.Dayjs | null, dayjs.Dayjs | null]>([
    null,
    null,
  ]);
  const [quickFilter, setQuickFilter] = useState<QuickFilter>('all');

  const getDateRange = (filter: QuickFilter): [string, string] | null => {
    const now = dayjs();
    switch (filter) {
      case 'today':
        return [now.startOf('day').toISOString(), now.endOf('day').toISOString()];
      case 'week':
        return [now.startOf('week').toISOString(), now.endOf('week').toISOString()];
      case 'month':
        return [now.startOf('month').toISOString(), now.endOf('month').toISOString()];
      default:
        return null;
    }
  };

  const [debouncedSearchKeyword, setDebouncedSearchKeyword] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchKeyword(searchKeyword);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchKeyword]);

  const loadHistory = async (page: number = 1) => {
    setLoading(true);
    try {
      const range = getDateRange(quickFilter);
      const startDate = range ? range[0] : dateRange[0]?.toISOString() || undefined;
      const endDate = range ? range[1] : dateRange[1]?.toISOString() || undefined;

      const result = await getHistory(page - 1, pageSize, {
        model: filterModel,
        promptKeyword: debouncedSearchKeyword || undefined,
        startDate,
        endDate,
      });
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

  useEffect(() => {
    if (visible) {
      setCurrentPage(1);
      loadHistory(1);
    }
  }, [debouncedSearchKeyword, filterModel, dateRange, quickFilter]);

  const groupedHistory = useMemo(() => {
    const groups: Record<string, GenerationHistory[]> = {};
    history.forEach(item => {
      const date = dayjs(item.created_at).format('YYYY-MM-DD');
      if (!groups[date]) {
        groups[date] = [];
      }
      groups[date].push(item);
    });
    return Object.entries(groups).sort((a, b) => b[0].localeCompare(a[0]));
  }, [history]);

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

  const handleQuickFilterChange = (value: QuickFilter) => {
    setQuickFilter(value);
    if (value !== 'all') {
      setDateRange([null, null]);
    }
  };

  const handleDateRangeChange = (dates: any) => {
    setDateRange(dates || [null, null]);
    if (dates) {
      setQuickFilter('all');
    }
  };

  const handleApplyParams = (record: GenerationHistory) => {
    if (onApplyParams) {
      onApplyParams(record.params);
      onClose();
    }
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
          {onApplyParams && (
            <Button type="link" size="small" onClick={() => handleApplyParams(record)}>
              使用参数
            </Button>
          )}
        </Space>
      ),
    },
  ];

  return (
    <Modal
      title="生成历史记录"
      open={visible}
      onCancel={onClose}
      footer={[
        <div
          key="footer"
          style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}
        >
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
          <Pagination
            current={currentPage}
            pageSize={pageSize}
            total={total}
            onChange={loadHistory}
            showSizeChanger={false}
          />
        </div>,
      ]}
      width={1100}
    >
      <div style={{ marginBottom: 16 }}>
        <Row gutter={[16, 16]}>
          <Col xs={24} sm={12} md={5}>
            <Input
              placeholder="搜索提示词..."
              prefix={<SearchOutlined />}
              value={searchKeyword}
              onChange={e => setSearchKeyword(e.target.value)}
              allowClear
            />
          </Col>
          <Col xs={24} sm={12} md={4}>
            <Select
              placeholder="选择模型"
              value={filterModel}
              onChange={setFilterModel}
              allowClear
              style={{ width: '100%' }}
              options={[
                { value: 'seedream', label: 'Seedream' },
                { value: 'banana_pro', label: 'Banana Pro' },
              ]}
            />
          </Col>
          <Col xs={24} sm={12} md={5}>
            <RangePicker
              value={dateRange}
              onChange={handleDateRangeChange}
              style={{ width: '100%' }}
            />
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Radio.Group
              value={quickFilter}
              onChange={e => handleQuickFilterChange(e.target.value)}
              optionType="button"
              buttonStyle="solid"
            >
              <Radio.Button value="all">全部</Radio.Button>
              <Radio.Button value="today">今天</Radio.Button>
              <Radio.Button value="week">本周</Radio.Button>
              <Radio.Button value="month">本月</Radio.Button>
            </Radio.Group>
          </Col>
          <Col xs={24} sm={12} md={4}>
            <Space>
              <Button onClick={() => loadHistory(1)} icon={<SearchOutlined />} type="primary">
                筛选
              </Button>
              <Button
                onClick={() => {
                  setSearchKeyword('');
                  setFilterModel(undefined);
                  setDateRange([null, null]);
                  setQuickFilter('all');
                }}
              >
                重置
              </Button>
            </Space>
          </Col>
        </Row>
      </div>

      <Spin spinning={loading}>
        {history.length > 0 ? (
          <AnimatePresence mode="popLayout">
            {groupedHistory.map(([date, items]) => (
              <motion.div
                key={date}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.3 }}
                style={{
                  marginBottom: 24,
                  padding: 16,
                  backgroundColor: 'rgba(255, 255, 255, 0.02)',
                  borderRadius: 12,
                  border: '1px solid rgba(0, 0, 0, 0.05)',
                }}
              >
                <div
                  style={{
                    marginBottom: 12,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <Space>
                    <div
                      style={{
                        width: 4,
                        height: 16,
                        backgroundColor: '#6366f1',
                        borderRadius: 2,
                      }}
                    />
                    <Text strong style={{ fontSize: 16 }}>
                      {dayjs(date).isSame(dayjs(), 'day')
                        ? '今天'
                        : dayjs(date).isSame(dayjs().subtract(1, 'day'), 'day')
                          ? '昨天'
                          : dayjs(date).format('YYYY年MM月DD日')}
                    </Text>
                    <Tag color="default" bordered={false} style={{ borderRadius: 10 }}>
                      {items.length} 条记录
                    </Tag>
                  </Space>
                </div>
                <Table
                  columns={columns}
                  dataSource={items}
                  rowKey="id"
                  pagination={false}
                  size="small"
                  scroll={{ x: 'max-content' }}
                  className="history-table"
                />
              </motion.div>
            ))}
          </AnimatePresence>
        ) : (
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description={<Text type="secondary">未找到相关历史记录</Text>}
            style={{ margin: '64px 0' }}
          />
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
              <div style={{ marginTop: 16 }}>
                <Text strong>生成的图片：</Text>
                <Row gutter={[16, 16]} style={{ marginTop: 8 }}>
                  {selectedHistory.images.map((img, idx) => (
                    <Col key={idx} span={12}>
                      <Image
                        src={img}
                        alt={`生成图片 ${idx + 1}`}
                        style={{ width: '100%', borderRadius: 8 }}
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
