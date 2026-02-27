use once_cell::sync::Lazy;
use regex::Regex;
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PromptSegment {
    #[serde(rename = "type")]
    pub segment_type: String,
    pub content: String,
    pub start_index: usize,
    pub end_index: usize,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CharacterRef {
    pub name: String,
    pub reference_image: Option<String>,
    pub bound: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ParsedPrompt {
    pub original: String,
    pub segments: Vec<PromptSegment>,
    pub characters: Vec<CharacterRef>,
}

static CHARACTER_PATTERN: Lazy<Regex> = Lazy::new(|| Regex::new(r"@(\w+)").unwrap());

static SCENE_KEYWORDS: Lazy<Vec<&'static str>> = Lazy::new(|| {
    let mut keywords = Vec::new();
    keywords.extend([
        "in", "at", "on", "under", "behind", "near", "between", "inside", "outside", "around",
    ]);
    keywords.extend([
        "forest", "beach", "mountain", "city", "village", "room", "building", "house", "castle",
        "temple",
    ]);
    keywords.extend([
        "sky", "sea", "ocean", "lake", "river", "stream", "park", "garden", "street", "road",
        "avenue",
    ]);
    keywords.extend([
        "desert", "jungle", "cave", "island", "coast", "shore", "meadow", "field", "valley",
    ]);
    keywords.extend([
        "在",
        "位于",
        "场景",
        "背景",
        "环境",
        "室内",
        "室外",
        "城市",
        "乡村",
        "森林",
        "海边",
        "山上",
        "天空",
        "夜晚",
        "白天",
        "早晨",
        "傍晚",
        "湖边",
        "河边",
        "公园",
        "花园",
        "街道",
        "建筑",
        "房间里",
        "水下",
        "云端",
        "沙漠",
        "雪地",
        "田野",
        "山谷",
        "海滩",
        "海岸",
        "草原",
        "山峰",
        "镇上",
        "村里",
        "城里",
        "屋外",
        "屋内",
        "学校",
        "医院",
        "商店",
        "餐厅",
        "办公室",
        "工厂",
        "图书馆",
        "博物馆",
        "剧院",
        "电影院",
        "火车站",
        "机场",
        "码头",
        "港口",
    ]);
    keywords
});

static ACTION_KEYWORDS: Lazy<Vec<&'static str>> = Lazy::new(|| {
    let mut keywords = Vec::new();
    keywords.extend([
        "doing",
        "running",
        "walking",
        "jumping",
        "sitting",
        "standing",
        "looking",
        "holding",
        "wearing",
        "carrying",
        "watching",
        "reading",
        "sleeping",
        "eating",
        "drinking",
        "playing",
        "fighting",
        "flying",
        "swimming",
        "dancing",
        "singing",
        "smiling",
        "laughing",
        "crying",
        "thinking",
        "working",
        "studying",
        "writing",
        "painting",
        "cooking",
        "shopping",
        "talking",
        "calling",
        "waiting",
        "hiding",
        "searching",
        "chasing",
        "escaping",
        "climbing",
        "falling",
        "landing",
        "greeting",
        "waving",
        "nodding",
        "shaking",
        "pointing",
        "drawing",
    ]);
    keywords.extend([
        "做",
        "正在",
        "进行",
        "行走",
        "奔跑",
        "跳跃",
        "坐着",
        "站立",
        "看着",
        "拿着",
        "穿着",
        "带着",
        "抱着",
        "走",
        "跑",
        "跳",
        "睡觉",
        "吃饭",
        "喝水",
        "玩耍",
        "战斗",
        "飞行",
        "游泳",
        "跳舞",
        "唱歌",
        "微笑",
        "大笑",
        "哭泣",
        "思考",
        "阅读",
        "写作",
        "画画",
        "工作",
        "学习",
        "说话",
        "等待",
        "隐藏",
        "寻找",
        "追逐",
        "逃跑",
        "爬",
        "落下",
        "着陆",
        "打招呼",
        "挥手",
        "点头",
        "摇头",
        "指",
        "画",
        "做家务",
        "做饭",
        "洗碗",
        "拖地",
        "打扫",
        "整理",
        "收拾",
    ]);
    keywords
});

static CHARACTER_KEYWORDS: Lazy<Vec<&'static str>> = Lazy::new(|| {
    let mut keywords = Vec::new();
    keywords.extend([
        "character",
        "person",
        "man",
        "woman",
        "boy",
        "girl",
        "people",
        "human",
        "hero",
        "warrior",
        "wizard",
        "elf",
        "dwarf",
        "knight",
        "prince",
        "princess",
        "king",
        "queen",
        "doctor",
        "teacher",
        "student",
        "worker",
        "farmer",
        "soldier",
        "police",
        "nurse",
        "driver",
        "pilot",
        "scientist",
        "artist",
        "musician",
        "actor",
        "child",
        "adult",
        "elder",
        "teenager",
    ]);
    keywords.extend([
        "人",
        "角色",
        "人物",
        "男子",
        "女子",
        "男孩",
        "女孩",
        "英雄",
        "战士",
        "巫师",
        "骑士",
        "王子",
        "公主",
        "国王",
        "王后",
        "医生",
        "老师",
        "学生",
        "工人",
        "农民",
        "士兵",
        "警察",
        "护士",
        "司机",
        "飞行员",
        "科学家",
        "艺术家",
        "音乐家",
        "演员",
        "小孩",
        "大人",
        "老人",
        "青少年",
        "中年人",
        "年轻人",
        "男人",
        "女人",
        "婴儿",
        "少年",
        "少女",
        "绅士",
        "淑女",
        "富人",
        "穷人",
        "老板",
        "员工",
        "经理",
        "总统",
        "部长",
        "市长",
    ]);
    keywords
});

static BACKGROUND_KEYWORDS: Lazy<Vec<&'static str>> = Lazy::new(|| {
    let mut keywords = Vec::new();
    keywords.extend([
        "background",
        "backdrop",
        "setting",
        "context",
        "environment",
        "scenery",
        "view",
        "perspective",
        "landscape",
        "horizon",
    ]);
    keywords.extend([
        "背景", "后景", "环境", "景色", "场景", "视野", "远景", "全景", "近景", "中景",
    ]);
    keywords
});

static TIME_KEYWORDS: Lazy<Vec<&'static str>> = Lazy::new(|| {
    let mut keywords = Vec::new();
    keywords.extend([
        "morning",
        "noon",
        "afternoon",
        "evening",
        "night",
        "midnight",
        "dawn",
        "dusk",
        "sunrise",
        "sunset",
        "day",
        "night",
        "twilight",
        "daytime",
        "nighttime",
    ]);
    keywords.extend([
        "早晨", "中午", "下午", "傍晚", "夜晚", "午夜", "黎明", "黄昏", "日出", "日落", "白天",
        "黑夜", "拂晓", "清晨", "正午",
    ]);
    keywords
});

static WEATHER_KEYWORDS: Lazy<Vec<&'static str>> = Lazy::new(|| {
    let mut keywords = Vec::new();
    keywords.extend([
        "sunny", "cloudy", "rainy", "snowy", "windy", "stormy", "foggy", "clear", "bright", "dark",
        "gloomy",
    ]);
    keywords.extend([
        "晴天", "阴天", "雨天", "雪天", "刮风", "风暴", "雾天", "多云", "晴朗", "明亮", "黑暗",
        "阴沉",
    ]);
    keywords
});

static STYLE_KEYWORDS: Lazy<Vec<&'static str>> = Lazy::new(|| {
    let mut keywords = Vec::new();
    keywords.extend([
        "anime",
        "cartoon",
        "realistic",
        "abstract",
        "modern",
        "classical",
        "traditional",
        "western",
        "eastern",
        "pixel",
        "3d",
        "2d",
        "oil",
        "watercolor",
        "sketch",
        "digital",
        "photo",
        "stylized",
        "cinematic",
        "portrait",
        "landscape",
        "close-up",
        "wide-shot",
        "panoramic",
    ]);
    keywords.extend([
        "动漫", "卡通", "写实", "抽象", "现代", "古典", "传统", "西方", "东方", "像素", "3D", "2D",
        "油画", "水彩", "素描", "数字", "照片", "电影", "肖像", "特写", "全景", "全身", "半身",
    ]);
    keywords
});

fn detect_segment_type(content: &str) -> String {
    let content_lower = content.to_lowercase();

    for keyword in TIME_KEYWORDS.iter() {
        if content_lower.contains(&keyword.to_lowercase()) {
            return "time".to_string();
        }
    }

    for keyword in WEATHER_KEYWORDS.iter() {
        if content_lower.contains(&keyword.to_lowercase()) {
            return "weather".to_string();
        }
    }

    for keyword in STYLE_KEYWORDS.iter() {
        if content_lower.contains(&keyword.to_lowercase()) {
            return "style".to_string();
        }
    }

    let mut max_score: i32 = 0;
    let mut detected_type = "other".to_string();

    for keyword in SCENE_KEYWORDS.iter() {
        if content_lower.contains(&keyword.to_lowercase()) {
            let score = keyword.len() as i32;
            if score > max_score {
                max_score = score;
                detected_type = "scene".to_string();
            }
        }
    }

    for keyword in ACTION_KEYWORDS.iter() {
        if content_lower.contains(&keyword.to_lowercase()) {
            let score = keyword.len() as i32;
            if score > max_score {
                max_score = score;
                detected_type = "action".to_string();
            }
        }
    }

    for keyword in CHARACTER_KEYWORDS.iter() {
        if content_lower.contains(&keyword.to_lowercase()) {
            let score = keyword.len() as i32;
            if score > max_score {
                max_score = score;
                detected_type = "character".to_string();
            }
        }
    }

    for keyword in BACKGROUND_KEYWORDS.iter() {
        if content_lower.contains(&keyword.to_lowercase()) {
            return "background".to_string();
        }
    }

    detected_type
}

fn segment_text(content: &str) -> Vec<PromptSegment> {
    let mut segments: Vec<PromptSegment> = Vec::new();
    let content = content.trim();

    if content.is_empty() {
        return segments;
    }

    let separators = ["，", ",", "。", ".", "！", "!", "？", "?", "；", ";"];
    let mut parts: Vec<String> = Vec::new();
    let mut current = String::new();

    for ch in content.chars() {
        let ch_str = ch.to_string();
        if separators.contains(&ch_str.as_str()) {
            if !current.trim().is_empty() {
                parts.push(current.trim().to_string());
            }
            current = String::new();
        } else {
            current.push(ch);
        }
    }
    if !current.trim().is_empty() {
        parts.push(current.trim().to_string());
    }

    if parts.is_empty() {
        parts.push(content.to_string());
    }

    let mut current_idx = 0_usize;
    for part in parts {
        let trimmed = part.trim();
        if !trimmed.is_empty() {
            let seg_type = detect_segment_type(trimmed);
            segments.push(PromptSegment {
                segment_type: seg_type,
                content: trimmed.to_string(),
                start_index: current_idx,
                end_index: current_idx + trimmed.len(),
            });
            current_idx += trimmed.len() + 1;
        }
    }

    if segments.is_empty() {
        segments.push(PromptSegment {
            segment_type: detect_segment_type(content),
            content: content.to_string(),
            start_index: 0,
            end_index: content.len(),
        });
    }

    segments
}

fn extract_character_references(prompt: &str) -> Vec<CharacterRef> {
    let mut characters = Vec::new();

    for cap in CHARACTER_PATTERN.captures_iter(prompt) {
        let name = cap
            .get(1)
            .map(|m| m.as_str().to_string())
            .unwrap_or_default();

        if !characters.iter().any(|c: &CharacterRef| c.name == name) {
            characters.push(CharacterRef {
                name,
                reference_image: None,
                bound: false,
            });
        }
    }

    characters
}

pub fn parse_prompt_internal(prompt: &str) -> Result<ParsedPrompt, String> {
    if prompt.is_empty() {
        return Err("Prompt cannot be empty".to_string());
    }

    let characters = extract_character_references(prompt);

    let clean_prompt = CHARACTER_PATTERN.replace_all(prompt, "").trim().to_string();

    let segments = if clean_prompt.is_empty() {
        vec![]
    } else {
        segment_text(&clean_prompt)
    };

    Ok(ParsedPrompt {
        original: prompt.to_string(),
        segments,
        characters,
    })
}

#[tauri::command]
pub fn parse_prompt(prompt: &str) -> Result<ParsedPrompt, String> {
    parse_prompt_internal(prompt)
}

#[tauri::command]
pub fn extract_character_names(prompt: &str) -> Vec<String> {
    extract_character_references(prompt)
        .iter()
        .map(|c| c.name.clone())
        .collect()
}

#[tauri::command]
pub fn test_parse(prompt: &str) -> Result<ParsedPrompt, String> {
    parse_prompt_internal(prompt)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_parse_chinese_prompt() {
        let prompt = "在阳光明媚的森林里@小明 正在愉快地跑步";
        let result = parse_prompt_internal(prompt).unwrap();

        assert_eq!(result.original, prompt);
        assert_eq!(result.characters.len(), 1);
        assert_eq!(result.characters[0].name, "小明");
        assert!(!result.segments.is_empty());

        println!("测试1 - 中文提示词: {:?}", result);
    }

    #[test]
    fn test_parse_english_prompt() {
        let prompt = "A beautiful sunset at the beach";
        let result = parse_prompt_internal(prompt).unwrap();

        assert!(!result.segments.is_empty());

        println!("测试2 - 英文提示词: {:?}", result);
    }

    #[test]
    fn test_parse_multiple_segments() {
        let prompt = "在森林里@小明 正在跑步，海边很美";
        let result = parse_prompt_internal(prompt).unwrap();

        assert_eq!(result.characters.len(), 1);
        assert!(result.segments.len() >= 2);

        println!("测试3 - 多段分割: {:?}", result);
    }

    #[test]
    fn test_parse_time_weather_style() {
        let prompt = "清晨的湖边@英雄 站在礁石上，晴天，动漫风格";
        let result = parse_prompt_internal(prompt).unwrap();

        let types: Vec<&str> = result
            .segments
            .iter()
            .map(|s| s.segment_type.as_str())
            .collect();
        println!("测试4 - 时间/天气/风格: {:?}", types);

        assert!(types.iter().any(|&t| t == "time" || t == "scene"));
    }
}
