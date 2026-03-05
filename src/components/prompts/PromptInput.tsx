import { Input, Button, Card, Typography, Space, Tag } from 'antd';
import { PlayCircleOutlined, AppstoreOutlined } from '@ant-design/icons';

const { TextArea } = Input;
const { Text } = Typography;

interface PromptInputProps {
  prompt: string;
  setPrompt: (value: string) => void;
  batchMode: boolean;
  setBatchMode: (value: boolean) => void;
  onParse: () => void;
  onBatchSplit: () => void;
  loading: boolean;
  batchSplitLoading: boolean;
}

const examplePrompts = [
  '在阳光明媚的森林里@小明 正在愉快地跑步',
  '夜晚的城市街道@女孩 穿着漂亮的裙子行走',
  '海边的日落@英雄 站在礁石上',
];

const batchExamplePrompts = {
  singleLine: [
    '在森林里@小明 跑步 | 海边@女孩 散步 | 山上@英雄',
    '@小明 和@小红 在公园 | @女孩 在学校 | @英雄 在城堡',
    '场景1：森林里@小明 场景2：海边@女孩 场景3：山上@英雄',
  ],
  multiLine: [
    '在森林里@小明 正在愉快地跑步\n海边@女孩 正在散步\n山上@英雄 站在礁石上',
    '@小明 在房间看书\n@女孩 在厨房做饭\n@英雄 在花园练剑',
    '场景1：在森林里@小明\n场景2：海边@女孩\n场景3：山上@英雄',
  ],
};

export function PromptInput({
  prompt,
  setPrompt,
  batchMode,
  setBatchMode,
  onParse,
  onBatchSplit,
  loading,
  batchSplitLoading,
}: PromptInputProps) {
  return (
    <Card
      className="prompt-card"
      variant="borderless"
      classNames={{
        body: 'p-4',
      }}
      styles={{
        body: { padding: '16px' },
      }}
    >
      <div className="flex justify-between items-center mb-4">
        <Text className="text-base font-medium text-gray-700 dark:text-gray-200">输入提示词</Text>
        <Space size="middle">
          <span className="text-indigo-500 font-medium">{batchMode ? '批量模式' : '单图模式'}</span>
          <Button
            type={batchMode ? 'primary' : 'default'}
            size="small"
            onClick={() => {
              setBatchMode(!batchMode);
              if (batchMode) {
                setPrompt('');
              }
            }}
            className={
              batchMode ? 'bg-gradient-to-r from-indigo-500 to-violet-500 border-none' : ''
            }
          >
            {batchMode ? '批量' : '单图'}
          </Button>
        </Space>
      </div>

      {batchMode && (
        <div className="mb-4 p-4 rounded-xl border border-sky-200 dark:border-sky-700 bg-gradient-to-br from-sky-50 to-blue-50 dark:from-slate-800 dark:to-slate-700">
          <div className="flex flex-wrap gap-4 items-center">
            <Space>
              <Tag color="blue">分隔符</Tag>
              <Input
                value={prompt.split('\n')[0]?.split('|')[0] || '|'}
                placeholder="| 或 ;; 或 ---"
                className="w-28"
                size="small"
              />
            </Space>
            <Space>
              <Tag color="purple">自动识别</Tag>
              <input type="checkbox" className="w-4 h-4" />
              <Text type="secondary" className="text-xs">
                智能拆分场景
              </Text>
            </Space>
          </div>
        </div>
      )}

      <TextArea
        value={prompt}
        onChange={e => setPrompt(e.target.value)}
        placeholder={
          batchMode
            ? '输入多个场景，用分隔符分开，如：场景1描述 | 场景2描述 | 场景3描述'
            : '描述你的画面，如：在森林里@小明 正在跑步...'
        }
        rows={batchMode ? 6 : 4}
        className="prompt-input !rounded-xl"
        maxLength={batchMode ? 2000 : 500}
        showCount
      />

      <div className="mt-4 flex justify-end gap-3">
        {batchMode ? (
          <Button
            type="primary"
            onClick={onBatchSplit}
            loading={batchSplitLoading}
            size="large"
            icon={<AppstoreOutlined />}
            className="bg-gradient-to-r from-indigo-500 to-violet-500 border-none"
          >
            拆分场景
          </Button>
        ) : (
          <Button
            type="primary"
            onClick={onParse}
            loading={loading}
            size="large"
            icon={<PlayCircleOutlined />}
            className="bg-gradient-to-r from-indigo-500 to-violet-500 border-none"
          >
            开始解析
          </Button>
        )}
      </div>

      <div className="mt-4">
        <Text type="secondary" className="text-sm">
          试试看：
        </Text>
        <Space wrap className="mt-2">
          {batchMode ? (
            <>
              <Text type="secondary" className="mr-2">
                单行：
              </Text>
              {batchExamplePrompts.singleLine.map((example, idx) => (
                <Tag
                  key={`single-${idx}`}
                  className="cursor-pointer hover:bg-indigo-50 dark:hover:bg-indigo-900 transition-colors"
                  onClick={() => setPrompt(example)}
                >
                  {example.slice(0, 20)}...
                </Tag>
              ))}
              <Text type="secondary" className="mr-2 ml-4">
                多行：
              </Text>
              {batchExamplePrompts.multiLine.map((example, idx) => (
                <Tag
                  key={`multi-${idx}`}
                  className="cursor-pointer hover:bg-indigo-50 dark:hover:bg-indigo-900 transition-colors"
                  onClick={() => setPrompt(example)}
                >
                  {example.slice(0, 20)}...
                </Tag>
              ))}
            </>
          ) : (
            examplePrompts.map((example, idx) => (
              <Tag
                key={`single-prompt-${idx}`}
                className="cursor-pointer hover:bg-indigo-50 dark:hover:bg-indigo-900 transition-colors"
                onClick={() => setPrompt(example)}
              >
                {example.slice(0, 20)}...
              </Tag>
            ))
          )}
        </Space>
      </div>
    </Card>
  );
}

export default PromptInput;
