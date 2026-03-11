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
  Flex,
  Descriptions,
  Input,
  Select,
  DatePicker,
  Radio,
  Form,
  InputNumber,
  Switch,
  message,
} from 'antd';
import {
  DeleteOutlined,
  EyeOutlined,
  ClearOutlined,
  SearchOutlined,
  RedoOutlined,
  EditOutlined,
  DownloadOutlined,
  SaveOutlined,
  SwapOutlined,
  CheckOutlined,
  CloseOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { motion, AnimatePresence } from 'framer-motion';
import dayjs from 'dayjs';
import {
  getHistory,
  deleteHistory,
  clearHistory,
  previewExportData,
  createExportPackage,
} from '../../api';

const { Text, Paragraph } = Typography;
const { RangePicker } = DatePicker;

interface GenerationHistory {
  id: string;
  prompt: string;
  model: string;
  params: Record<string, unknown>;
  images: string[];
  characters: string[];
  status: string;
  source_history_id?: string;
  created_at: string;
  updated_at: string;
}

interface HistoryListProps {
  visible: boolean;
  onClose: () => void;
  onApplyParams?: (params: any) => void;
  onRegenerate?: (history: GenerationHistory, newParams?: Record<string, unknown>) => void;
}

type QuickFilter = 'all' | 'today' | 'week' | 'month';

export function HistoryList({ visible, onClose, onApplyParams, onRegenerate }: HistoryListProps) {
  const [history, setHistory] = useState<GenerationHistory[]>([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(10);
  const [detailVisible, setDetailVisible] = useState(false);
  const [selectedHistory, setSelectedHistory] = useState<GenerationHistory | null>(null);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editingHistory, setEditingHistory] = useState<GenerationHistory | null>(null);
  const [editForm] = Form.useForm();

  const [searchKeyword, setSearchKeyword] = useState('');
  const [filterModel, setFilterModel] = useState<string | undefined>();
  const [dateRange, setDateRange] = useState<[dayjs.Dayjs | null, dayjs.Dayjs | null]>([
    null,
    null,
  ]);
  const [quickFilter, setQuickFilter] = useState<QuickFilter>('all');
  const [exporting, setExporting] = useState(false);
  const [exportPackageModalVisible, setExportPackageModalVisible] = useState(false);
  const [exportPreviewData, setExportPreviewData] = useState<any[]>([]);
  const [exportLoading, setExportLoading] = useState(false);
  const [filterCharacter, setFilterCharacter] = useState<string | undefined>();
  const [filterWidthMin, setFilterWidthMin] = useState<number | undefined>();
  const [filterWidthMax, setFilterWidthMax] = useState<number | undefined>();
  const [filterHeightMin, setFilterHeightMin] = useState<number | undefined>();
  const [filterHeightMax, setFilterHeightMax] = useState<number | undefined>();
  const [filterQuality, setFilterQuality] = useState<string | undefined>();
  const [savedFilters, setSavedFilters] = useState<
    Array<{
      id: string;
      name: string;
      model?: string;
      prompt_keyword?: string;
      character?: string;
      width_min?: number;
      width_max?: number;
      height_min?: number;
      height_max?: number;
      quality?: string;
    }>
  >([]);
  const [saveFilterModalVisible, setSaveFilterModalVisible] = useState(false);
  const [saveFilterName, setSaveFilterName] = useState('');
  const [compareItems, setCompareItems] = useState<GenerationHistory[]>([]);
  const [compareModalVisible, setCompareModalVisible] = useState(false);
  const [compareEditModalVisible, setCompareEditModalVisible] = useState(false);
  const [compareEditingItem, setCompareEditingItem] = useState<GenerationHistory | null>(null);
  const [compareEditForm] = Form.useForm();

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
        character: filterCharacter,
        widthMin: filterWidthMin,
        widthMax: filterWidthMax,
        heightMin: filterHeightMin,
        heightMax: filterHeightMax,
        quality: filterQuality,
      });
      setHistory(result.items);
      setTotal(result.total);
      setCurrentPage(page);
    } catch (error) {
      console.error('加载历史记录失败:', error);
      message.error(`加载历史记录失败: ${String(error)}`);
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
  }, [
    debouncedSearchKeyword,
    filterModel,
    dateRange,
    quickFilter,
    filterCharacter,
    filterWidthMin,
    filterWidthMax,
    filterHeightMin,
    filterHeightMax,
    filterQuality,
  ]);

  useEffect(() => {
    if (visible) {
      loadSavedFilters();
    }
  }, [visible]);

  const loadSavedFilters = async () => {
    try {
      const { getSavedFilters } = await import('../../api');
      const filters = await getSavedFilters();
      setSavedFilters(filters);
    } catch (error) {
      console.error('加载筛选方案失败:', error);
    }
  };

  const handleSaveFilter = async () => {
    if (!saveFilterName.trim()) {
      message.warning('请输入筛选方案名称');
      return;
    }
    try {
      const { addSavedFilter } = await import('../../api');
      await addSavedFilter({
        name: saveFilterName,
        model: filterModel,
        prompt_keyword: searchKeyword,
        character: filterCharacter,
        width_min: filterWidthMin,
        width_max: filterWidthMax,
        height_min: filterHeightMin,
        height_max: filterHeightMax,
        quality: filterQuality,
      });
      message.success('筛选方案已保存');
      setSaveFilterModalVisible(false);
      setSaveFilterName('');
      loadSavedFilters();
    } catch (error) {
      console.error('保存筛选方案失败:', error);
      message.error('保存筛选方案失败');
    }
  };

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

  const getCurrentFilter = () => {
    const range = getDateRange(quickFilter);
    return {
      model: filterModel,
      promptKeyword: searchKeyword.trim() || undefined,
      startDate: range ? range[0] : dateRange[0]?.toISOString() || undefined,
      endDate: range ? range[1] : dateRange[1]?.toISOString() || undefined,
    };
  };

  const fetchAllFilteredHistory = async () => {
    const allItems: GenerationHistory[] = [];
    const filter = getCurrentFilter();
    let page = 0;
    const fetchSize = 200;
    while (true) {
      const result = await getHistory(page, fetchSize, filter);
      allItems.push(...result.items);
      if (allItems.length >= result.total || result.items.length === 0) break;
      page += 1;
    }
    return allItems;
  };

  const toMarkdown = (items: GenerationHistory[]) => {
    const lines: string[] = [];
    lines.push('# 生成历史导出');
    lines.push('');
    lines.push(`导出时间: ${new Date().toLocaleString('zh-CN')}`);
    lines.push(`记录数: ${items.length}`);
    lines.push('');
    for (const item of items) {
      lines.push(`## ${item.id}`);
      lines.push('');
      lines.push(`- 时间: ${new Date(item.created_at).toLocaleString('zh-CN')}`);
      lines.push(`- 模型: ${item.model}`);
      lines.push(`- 状态: ${item.status}`);
      lines.push(`- 图片数: ${item.images?.length || 0}`);
      lines.push(`- 角色: ${item.characters?.join(', ') || '无'}`);
      lines.push('');
      lines.push('### 提示词');
      lines.push('');
      lines.push(item.prompt || '');
      lines.push('');
      lines.push('### 参数');
      lines.push('');
      lines.push('```json');
      lines.push(JSON.stringify(item.params || {}, null, 2));
      lines.push('```');
      lines.push('');
    }
    return lines.join('\n');
  };

  const downloadText = (content: string, fileName: string) => {
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const saveExportFile = async (content: string, suggestedName: string, ext: 'json' | 'md') => {
    try {
      const { save } = await import('@tauri-apps/plugin-dialog');
      const filePath = await save({
        defaultPath: suggestedName,
        filters: [
          {
            name: ext === 'json' ? 'JSON' : 'Markdown',
            extensions: [ext],
          },
        ],
      });
      if (!filePath) return false;

      const { invoke } = await import('@tauri-apps/api/core');
      await invoke('save_text_to_file', { content, filePath });
      return true;
    } catch {
      downloadText(content, suggestedName);
      return true;
    }
  };

  const handleExport = async (format: 'json' | 'md') => {
    setExporting(true);
    try {
      const items = await fetchAllFilteredHistory();
      if (items.length === 0) {
        message.warning('当前筛选条件下没有可导出的历史记录');
        return;
      }
      const now = dayjs().format('YYYYMMDD_HHmmss');
      const fileName = `history_export_${now}.${format}`;
      const content = format === 'json' ? JSON.stringify(items, null, 2) : toMarkdown(items);
      const ok = await saveExportFile(content, fileName, format);
      if (ok) {
        message.success(`历史记录已导出为 ${format.toUpperCase()}`);
      }
    } catch (error) {
      message.error(`导出失败: ${String(error)}`);
    } finally {
      setExporting(false);
    }
  };

  const handleOpenExportPackage = async () => {
    setExportPackageModalVisible(true);
    setExportLoading(true);
    try {
      const query: any = {
        start_date: dateRange?.[0]?.toISOString(),
        end_date: dateRange?.[1]?.toISOString(),
        model: filterModel,
        prompt_keyword: searchKeyword,
        character: filterCharacter,
      };
      const data = await previewExportData(query);
      setExportPreviewData(data);
    } catch (error) {
      console.error('预览导出数据失败:', error);
      message.error('预览导出数据失败');
    } finally {
      setExportLoading(false);
    }
  };

  const handleExportPackage = async () => {
    setExportLoading(true);
    try {
      const query: any = {
        start_date: dateRange?.[0]?.toISOString(),
        end_date: dateRange?.[1]?.toISOString(),
        model: filterModel,
        prompt_keyword: searchKeyword,
        character: filterCharacter,
      };

      const { save } = await import('@tauri-apps/plugin-dialog');
      const filePath = await save({
        defaultPath: `project_export_${dayjs().format('YYYYMMDD_HHmmss')}.zip`,
        filters: [{ name: 'ZIP', extensions: ['zip'] }],
      });

      if (filePath) {
        const result = await createExportPackage(query, filePath);
        message.success(`项目导出成功！共导出 ${result.record_count} 条记录`);
        setExportPackageModalVisible(false);
      }
    } catch (error) {
      console.error('导出项目包失败:', error);
      message.error(`导出项目包失败: ${error}`);
    } finally {
      setExportLoading(false);
    }
  };

  const handleApplyParams = (record: GenerationHistory) => {
    if (onApplyParams) {
      onApplyParams(record.params);
      onClose();
    }
  };

  const handleQuickRegenerate = (record: GenerationHistory) => {
    if (onRegenerate) {
      onRegenerate(record);
    }
  };

  const handleEditRegenerate = (record: GenerationHistory) => {
    setEditingHistory(record);
    const formValues: Record<string, unknown> = {
      prompt: record.prompt,
      model: record.model,
      ...record.params,
    };
    if (record.model === 'seedream' && record.params.width && record.params.height) {
      formValues.size = `${record.params.width}x${record.params.height}`;
    }
    editForm.setFieldsValue(formValues);
    setEditModalVisible(true);
    setTimeout(() => {
      editForm.setFieldsValue(formValues);
    }, 100);
  };

  const handleEditConfirm = () => {
    if (editingHistory && onRegenerate) {
      editForm.validateFields().then(values => {
        const newParams = {
          ...editingHistory.params,
          prompt: values.prompt,
          model: values.model,
          width: values.width,
          height: values.height,
          quality: values.quality,
          watermark: values.watermark,
          size: values.size,
        };
        onRegenerate(editingHistory, newParams);
        setEditModalVisible(false);
        setEditingHistory(null);
      });
    }
  };

  const handleAddToCompare = (record: GenerationHistory) => {
    if (compareItems.length >= 2) {
      message.warning('最多只能选择2条记录进行对比');
      return;
    }
    if (compareItems.some(item => item.id === record.id)) {
      message.warning('该记录已在对比列表中');
      return;
    }
    setCompareItems([...compareItems, record]);
  };

  const handleRemoveFromCompare = (id: string) => {
    setCompareItems(compareItems.filter(item => item.id !== id));
  };

  const handleClearCompare = () => {
    setCompareItems([]);
  };

  const handleCompare = () => {
    if (compareItems.length !== 2) {
      message.warning('请选择2条记录进行对比');
      return;
    }
    setCompareModalVisible(true);
  };

  const computeParamDiff = (item1: GenerationHistory, item2: GenerationHistory) => {
    const params1 = item1.params || {};
    const params2 = item2.params || {};
    const keys = new Set([...Object.keys(params1), ...Object.keys(params2)]);
    const diffs: Array<{ key: string; value1: string; value2: string; isDifferent: boolean }> = [];

    const formatValue = (val: unknown): string => {
      if (val === undefined || val === null) return '-';
      return String(val);
    };

    const keyLabels: Record<string, string> = {
      model: '模型',
      width: '宽度',
      height: '高度',
      size: '分辨率',
      quality: '质量',
      watermark: '水印',
      prompt: '提示词',
    };

    keys.forEach(key => {
      const val1 = params1[key];
      const val2 = params2[key];
      const isDifferent = JSON.stringify(val1) !== JSON.stringify(val2);
      diffs.push({
        key: keyLabels[key] || key,
        value1: formatValue(val1),
        value2: formatValue(val2),
        isDifferent,
      });
    });

    return diffs;
  };

  const handleQuickRegenerateFromCompare = (record: GenerationHistory) => {
    if (onRegenerate) {
      onRegenerate(record);
    }
    setCompareModalVisible(false);
  };

  const handleEditRegenerateFromCompare = (record: GenerationHistory) => {
    const formValues: Record<string, unknown> = {
      prompt: record.prompt,
      model: record.model,
      ...record.params,
    };
    if (record.model === 'seedream' && record.params.width && record.params.height) {
      formValues.size = `${record.params.width}x${record.params.height}`;
    }
    setCompareEditingItem(record);
    compareEditForm.setFieldsValue(formValues);
    setCompareEditModalVisible(true);
    setTimeout(() => {
      compareEditForm.setFieldsValue(formValues);
    }, 100);
  };

  const handleEditCompareConfirm = () => {
    if (compareEditingItem && onRegenerate) {
      compareEditForm.validateFields().then(values => {
        const newParams = {
          ...compareEditingItem.params,
          prompt: values.prompt,
          model: values.model,
          width: values.width,
          height: values.height,
          quality: values.quality,
          watermark: values.watermark,
          size: values.size,
        };
        onRegenerate(compareEditingItem, newParams);
        setCompareEditModalVisible(false);
        setCompareEditingItem(null);
        setCompareModalVisible(false);
      });
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
      width: 220,
      render: (_, record) => (
        <Space>
          <Button type="text" icon={<EyeOutlined />} onClick={() => handleViewDetail(record)}>
            查看
          </Button>
          <Button
            type="text"
            icon={<SwapOutlined />}
            onClick={() => handleAddToCompare(record)}
            disabled={compareItems.length >= 2 && !compareItems.some(item => item.id === record.id)}
          >
            对比
          </Button>
          {onRegenerate && (
            <Button
              type="text"
              icon={<RedoOutlined />}
              onClick={() => handleQuickRegenerate(record)}
            >
              重生成
            </Button>
          )}
          {onRegenerate && (
            <Button
              type="text"
              icon={<EditOutlined />}
              onClick={() => handleEditRegenerate(record)}
            >
              编辑
            </Button>
          )}
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
          <Space>
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
            <Button
              icon={<DownloadOutlined />}
              onClick={() => handleExport('json')}
              loading={exporting}
            >
              导出JSON
            </Button>
            <Button
              icon={<DownloadOutlined />}
              onClick={() => handleExport('md')}
              loading={exporting}
            >
              导出MD
            </Button>
            <Button
              type="primary"
              icon={<SaveOutlined />}
              onClick={handleOpenExportPackage}
              loading={exportLoading}
            >
              导出项目包
            </Button>
          </Space>
          <Pagination
            current={currentPage}
            pageSize={pageSize}
            total={total}
            onChange={loadHistory}
            showSizeChanger={false}
          />
        </div>,
      ]}
      width="95vw"
      style={{ maxWidth: 1100, top: 20 }}
    >
      <div style={{ marginBottom: 16 }}>
        <Flex wrap="wrap" gap="middle" align="center">
          <Input
            placeholder="搜索提示词..."
            prefix={<SearchOutlined />}
            value={searchKeyword}
            onChange={e => setSearchKeyword(e.target.value)}
            allowClear
            style={{ minWidth: 200, flex: 1 }}
          />
          <Select
            placeholder="选择模型"
            value={filterModel}
            onChange={setFilterModel}
            allowClear
            style={{ minWidth: 120, flex: 1 }}
            options={[
              { value: 'seedream', label: 'Seedream' },
              { value: 'banana_pro', label: 'Banana Pro' },
            ]}
          />
          <RangePicker
            value={dateRange}
            onChange={handleDateRangeChange}
            style={{ minWidth: 240, flex: 1 }}
          />
          <Input
            placeholder="角色筛选"
            value={filterCharacter}
            onChange={e => setFilterCharacter(e.target.value || undefined)}
            allowClear
            style={{ minWidth: 100, flex: 1 }}
          />
          <Input.Group compact>
            <InputNumber
              placeholder="宽"
              value={filterWidthMin}
              onChange={v => setFilterWidthMin(v || undefined)}
              min={256}
              max={2048}
              style={{ width: 70 }}
              addonAfter="~"
            />
            <InputNumber
              placeholder="宽"
              value={filterWidthMax}
              onChange={v => setFilterWidthMax(v || undefined)}
              min={256}
              max={2048}
              style={{ width: 70 }}
            />
          </Input.Group>
          <Input.Group compact>
            <InputNumber
              placeholder="高"
              value={filterHeightMin}
              onChange={v => setFilterHeightMin(v || undefined)}
              min={256}
              max={2048}
              style={{ width: 70 }}
              addonAfter="~"
            />
            <InputNumber
              placeholder="高"
              value={filterHeightMax}
              onChange={v => setFilterHeightMax(v || undefined)}
              min={256}
              max={2048}
              style={{ width: 70 }}
            />
          </Input.Group>
          <Select
            placeholder="质量"
            value={filterQuality}
            onChange={setFilterQuality}
            allowClear
            style={{ minWidth: 80 }}
            options={[
              { value: 'standard', label: '标准' },
              { value: 'high', label: '高' },
              { value: 'ultra', label: '超高' },
            ]}
          />
          <Select
            placeholder="筛选方案"
            allowClear
            style={{ minWidth: 120 }}
            onChange={value => {
              const filter = savedFilters.find(f => f.id === value);
              if (filter) {
                setFilterModel(filter.model);
                setSearchKeyword(filter.prompt_keyword || '');
                setFilterCharacter(filter.character);
                setFilterWidthMin(filter.width_min);
                setFilterWidthMax(filter.width_max);
                setFilterHeightMin(filter.height_min);
                setFilterHeightMax(filter.height_max);
                setFilterQuality(filter.quality);
              }
            }}
            options={savedFilters.map(f => ({ value: f.id, label: f.name }))}
          />
          <Button onClick={() => setSaveFilterModalVisible(true)} icon={<SaveOutlined />}>
            保存
          </Button>
          <Radio.Group
            value={quickFilter}
            onChange={e => handleQuickFilterChange(e.target.value)}
            optionType="button"
            buttonStyle="solid"
            style={{ whiteSpace: 'nowrap' }}
          >
            <Radio.Button value="all">全部</Radio.Button>
            <Radio.Button value="today">今天</Radio.Button>
            <Radio.Button value="week">本周</Radio.Button>
            <Radio.Button value="month">本月</Radio.Button>
          </Radio.Group>
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
        </Flex>
      </div>

      {compareItems.length > 0 && (
        <div
          style={{
            marginBottom: 16,
            padding: 12,
            backgroundColor: 'rgba(99, 102, 241, 0.1)',
            borderRadius: 8,
            border: '1px solid rgba(99, 102, 241, 0.3)',
          }}
        >
          <Flex align="center" gap="middle" justify="space-between">
            <Space>
              <Text strong>已选择对比 ({compareItems.length}/2)：</Text>
              {compareItems.map((item, idx) => (
                <Tag
                  key={item.id}
                  closable
                  onClose={() => handleRemoveFromCompare(item.id)}
                  color="blue"
                >
                  {idx + 1}. {item.prompt?.substring(0, 20) || '无提示词'}...
                </Tag>
              ))}
            </Space>
            <Space>
              <Button onClick={handleClearCompare} icon={<CloseOutlined />}>
                清空
              </Button>
              <Button
                type="primary"
                onClick={handleCompare}
                disabled={compareItems.length !== 2}
                icon={<SwapOutlined />}
              >
                开始对比
              </Button>
            </Space>
          </Flex>
        </div>
      )}

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
        width="95vw"
        style={{ maxWidth: 800 }}
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

      <Modal
        title="编辑参数重新生成"
        open={editModalVisible}
        onCancel={() => {
          setEditModalVisible(false);
          setEditingHistory(null);
        }}
        okText="开始生成"
        cancelText="取消"
        width="95vw"
        style={{ maxWidth: 600 }}
        maskClosable={false}
        closable
        footer={[
          <Button
            key="cancel"
            onClick={() => {
              setEditModalVisible(false);
              setEditingHistory(null);
            }}
          >
            取消
          </Button>,
          <Button key="ok" type="primary" onClick={handleEditConfirm}>
            开始生成
          </Button>,
        ]}
      >
        <Form
          form={editForm}
          layout="vertical"
          onValuesChange={(changedValues, allValues) => {
            if (changedValues.model) {
              setEditingHistory(prev => (prev ? { ...prev, model: allValues.model } : null));
            }
          }}
        >
          <Form.Item
            name="prompt"
            label="提示词"
            rules={[{ required: true, message: '请输入提示词' }]}
          >
            <Input.TextArea rows={4} placeholder="输入图像描述" />
          </Form.Item>
          <Form.Item name="model" label="模型">
            <Select
              options={[
                { value: 'seedream', label: 'Seedream' },
                { value: 'banana_pro', label: 'Banana Pro' },
              ]}
            />
          </Form.Item>
          <Form.Item noStyle shouldUpdate={(prev, curr) => prev.model !== curr.model}>
            {() => {
              const model = editForm.getFieldValue('model') || editingHistory?.model;
              if (model === 'seedream') {
                return (
                  <Form.Item name="size" label="图片尺寸">
                    <Select
                      options={[
                        { value: '1024x1024', label: '1K (1024x1024)' },
                        { value: '2048x2048', label: '2K (2048x2048)' },
                        { value: '4096x4096', label: '4K (4096x4096)' },
                      ]}
                    />
                  </Form.Item>
                );
              }
              if (model === 'banana_pro') {
                return (
                  <Form.Item name="size" label="分辨率">
                    <Select
                      options={[
                        { value: '1024x1024', label: '1024x1024' },
                        { value: '1152x896', label: '1152x896' },
                        { value: '1216x832', label: '1216x832' },
                        { value: '1344x768', label: '1344x768' },
                        { value: '1536x640', label: '1536x640' },
                      ]}
                    />
                  </Form.Item>
                );
              }
              return null;
            }}
          </Form.Item>
          <Form.Item name="quality" label="质量">
            <Select
              options={[
                { value: 'standard', label: '标准' },
                { value: 'high', label: '高' },
                { value: 'ultra', label: '超高' },
              ]}
            />
          </Form.Item>
          <Form.Item name="watermark" label="水印" valuePropName="checked">
            <Switch checkedChildren="开启" unCheckedChildren="关闭" />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="保存筛选方案"
        open={saveFilterModalVisible}
        onCancel={() => setSaveFilterModalVisible(false)}
        onOk={handleSaveFilter}
        okText="保存"
        cancelText="取消"
      >
        <Input
          placeholder="请输入筛选方案名称"
          value={saveFilterName}
          onChange={e => setSaveFilterName(e.target.value)}
        />
      </Modal>

      <Modal
        title="结果对比"
        open={compareModalVisible}
        onCancel={() => setCompareModalVisible(false)}
        footer={[
          <Button key="close" onClick={() => setCompareModalVisible(false)}>
            关闭
          </Button>,
        ]}
        width="95vw"
        style={{ maxWidth: 1200 }}
        closable
      >
        {compareItems.length === 2 && (
          <div>
            <Flex gap="middle" style={{ marginBottom: 24 }}>
              <div
                style={{
                  flex: 1,
                  padding: 16,
                  backgroundColor: 'rgba(99, 102, 241, 0.05)',
                  borderRadius: 8,
                  border: '1px solid rgba(99, 102, 241, 0.2)',
                }}
              >
                <Space style={{ marginBottom: 12 }}>
                  <Tag color="blue">记录 1</Tag>
                  <Text type="secondary">
                    {new Date(compareItems[0].created_at).toLocaleString('zh-CN')}
                  </Text>
                </Space>
                <Paragraph ellipsis={{ rows: 2 }} style={{ marginBottom: 12 }}>
                  <Text strong>提示词：</Text>
                  {compareItems[0].prompt}
                </Paragraph>
                {compareItems[0].images && compareItems[0].images.length > 0 && (
                  <Row gutter={[8, 8]}>
                    {compareItems[0].images.map((img, idx) => (
                      <Col key={idx} span={12}>
                        <Image
                          src={img}
                          alt={`图片 ${idx + 1}`}
                          style={{ width: '100%', borderRadius: 4 }}
                        />
                      </Col>
                    ))}
                  </Row>
                )}
                <div style={{ marginTop: 12 }}>
                  <Space>
                    <Button
                      type="primary"
                      icon={<CheckOutlined />}
                      onClick={() => handleQuickRegenerateFromCompare(compareItems[0])}
                    >
                      一键沿用
                    </Button>
                    <Button
                      icon={<EditOutlined />}
                      onClick={() => handleEditRegenerateFromCompare(compareItems[0])}
                    >
                      编辑后生成
                    </Button>
                  </Space>
                </div>
              </div>
              <div
                style={{
                  flex: 1,
                  padding: 16,
                  backgroundColor: 'rgba(16, 185, 129, 0.05)',
                  borderRadius: 8,
                  border: '1px solid rgba(16, 185, 129, 0.2)',
                }}
              >
                <Space style={{ marginBottom: 12 }}>
                  <Tag color="green">记录 2</Tag>
                  <Text type="secondary">
                    {new Date(compareItems[1].created_at).toLocaleString('zh-CN')}
                  </Text>
                </Space>
                <Paragraph ellipsis={{ rows: 2 }} style={{ marginBottom: 12 }}>
                  <Text strong>提示词：</Text>
                  {compareItems[1].prompt}
                </Paragraph>
                {compareItems[1].images && compareItems[1].images.length > 0 && (
                  <Row gutter={[8, 8]}>
                    {compareItems[1].images.map((img, idx) => (
                      <Col key={idx} span={12}>
                        <Image
                          src={img}
                          alt={`图片 ${idx + 1}`}
                          style={{ width: '100%', borderRadius: 4 }}
                        />
                      </Col>
                    ))}
                  </Row>
                )}
                <div style={{ marginTop: 12 }}>
                  <Space>
                    <Button
                      type="primary"
                      icon={<CheckOutlined />}
                      onClick={() => handleQuickRegenerateFromCompare(compareItems[1])}
                    >
                      一键沿用
                    </Button>
                    <Button
                      icon={<EditOutlined />}
                      onClick={() => handleEditRegenerateFromCompare(compareItems[1])}
                    >
                      编辑后生成
                    </Button>
                  </Space>
                </div>
              </div>
            </Flex>

            <div style={{ marginTop: 24 }}>
              <Text strong style={{ fontSize: 16 }}>
                参数差异对比：
              </Text>
              <Table
                dataSource={computeParamDiff(compareItems[0], compareItems[1])}
                columns={[
                  { title: '参数', dataIndex: 'key', key: 'key', width: 120 },
                  {
                    title: '记录 1',
                    dataIndex: 'value1',
                    key: 'value1',
                    render: (val, record) => (
                      <span
                        style={{
                          color: record.isDifferent ? '#ef4444' : undefined,
                          fontWeight: record.isDifferent ? 'bold' : undefined,
                        }}
                      >
                        {val}
                      </span>
                    ),
                  },
                  {
                    title: '记录 2',
                    dataIndex: 'value2',
                    key: 'value2',
                    render: (val, record) => (
                      <span
                        style={{
                          color: record.isDifferent ? '#10b981' : undefined,
                          fontWeight: record.isDifferent ? 'bold' : undefined,
                        }}
                      >
                        {val}
                      </span>
                    ),
                  },
                  {
                    title: '差异',
                    key: 'diff',
                    render: (_, record) =>
                      record.isDifferent ? <Tag color="orange">有差异</Tag> : <Tag>相同</Tag>,
                  },
                ]}
                rowKey="key"
                pagination={false}
                size="small"
                style={{ marginTop: 12 }}
              />
            </div>
          </div>
        )}
      </Modal>

      <Modal
        title="编辑参数重新生成"
        open={compareEditModalVisible}
        onCancel={() => {
          setCompareEditModalVisible(false);
          setCompareEditingItem(null);
        }}
        okText="开始生成"
        cancelText="取消"
        width="95vw"
        style={{ maxWidth: 600 }}
        maskClosable={false}
        closable
        footer={[
          <Button
            key="cancel"
            onClick={() => {
              setCompareEditModalVisible(false);
              setCompareEditingItem(null);
            }}
          >
            取消
          </Button>,
          <Button key="ok" type="primary" onClick={handleEditCompareConfirm}>
            开始生成
          </Button>,
        ]}
      >
        <Form
          form={compareEditForm}
          layout="vertical"
          onValuesChange={(changedValues, allValues) => {
            if (changedValues.model) {
              setCompareEditingItem(prev => (prev ? { ...prev, model: allValues.model } : null));
            }
          }}
        >
          <Form.Item
            name="prompt"
            label="提示词"
            rules={[{ required: true, message: '请输入提示词' }]}
          >
            <Input.TextArea rows={4} placeholder="输入图像描述" />
          </Form.Item>
          <Form.Item name="model" label="模型">
            <Select
              options={[
                { value: 'seedream', label: 'Seedream' },
                { value: 'banana_pro', label: 'Banana Pro' },
              ]}
            />
          </Form.Item>
          <Form.Item noStyle shouldUpdate={(prev, curr) => prev.model !== curr.model}>
            {() => {
              const model = compareEditForm.getFieldValue('model') || compareEditingItem?.model;
              if (model === 'seedream') {
                return (
                  <Form.Item name="size" label="图片尺寸">
                    <Select
                      options={[
                        { value: '1024x1024', label: '1K (1024x1024)' },
                        { value: '2048x2048', label: '2K (2048x2048)' },
                        { value: '4096x4096', label: '4K (4096x4096)' },
                      ]}
                    />
                  </Form.Item>
                );
              }
              if (model === 'banana_pro') {
                return (
                  <Form.Item name="size" label="分辨率">
                    <Select
                      options={[
                        { value: '1024x1024', label: '1024x1024' },
                        { value: '1152x896', label: '1152x896' },
                        { value: '1216x832', label: '1216x832' },
                        { value: '1344x768', label: '1344x768' },
                        { value: '1536x640', label: '1536x640' },
                      ]}
                    />
                  </Form.Item>
                );
              }
              return null;
            }}
          </Form.Item>
          <Form.Item name="quality" label="质量">
            <Select
              options={[
                { value: 'standard', label: '标准' },
                { value: 'high', label: '高' },
                { value: 'ultra', label: '超高' },
              ]}
            />
          </Form.Item>
          <Form.Item name="watermark" label="水印" valuePropName="checked">
            <Switch checkedChildren="开启" unCheckedChildren="关闭" />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="导出项目包"
        open={exportPackageModalVisible}
        onCancel={() => setExportPackageModalVisible(false)}
        footer={[
          <Button key="cancel" onClick={() => setExportPackageModalVisible(false)}>
            取消
          </Button>,
          <Button
            key="export"
            type="primary"
            icon={<SaveOutlined />}
            onClick={handleExportPackage}
            loading={exportLoading}
            disabled={exportPreviewData.length === 0}
          >
            确认导出 ZIP
          </Button>,
        ]}
        width={700}
      >
        <Spin spinning={exportLoading}>
          <div style={{ marginBottom: 16 }}>
            <Text type="secondary">
              将导出当前筛选条件下的 {exportPreviewData.length} 条记录，包含图片、提示词、参数等信息
            </Text>
          </div>
          <div style={{ maxHeight: 400, overflow: 'auto' }}>
            {exportPreviewData.slice(0, 20).map((record: any, index: number) => (
              <div
                key={record.id}
                style={{
                  padding: '8px 12px',
                  borderBottom: '1px solid #f0f0f0',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                }}
              >
                <Text type="secondary">{index + 1}.</Text>
                <div style={{ flex: 1 }}>
                  <div>
                    <Tag color="blue">{record.model}</Tag>
                    <Text type="secondary">
                      {record.width}x{record.height} | {record.quality}
                    </Text>
                  </div>
                  <Text type="secondary" ellipsis style={{ maxWidth: 400 }}>
                    {record.prompt?.substring(0, 50)}...
                  </Text>
                </div>
                {record.image_filename && <Tag color="green">有图片</Tag>}
              </div>
            ))}
            {exportPreviewData.length > 20 && (
              <div style={{ padding: 8, textAlign: 'center' }}>
                <Text type="secondary">...还有 {exportPreviewData.length - 20} 条记录</Text>
              </div>
            )}
          </div>
          {exportPreviewData.length === 0 && <Empty description="没有符合条件的记录" />}
        </Spin>
      </Modal>
    </Modal>
  );
}

export default HistoryList;
