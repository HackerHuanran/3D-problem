// src/data/problems.js
// 3D打印常见问题数据

export const problems = [
  {
    id: 'warping',
    category: '新手',
    title: '打印件翘边',
    subtitle: '底部脱离热床',
    emoji: '🌀',
    color: '#FF6B6B',
    bgGradient: 'linear-gradient(135deg, #1a0a0a 0%, #2d0f0f 100%)',
    difficulty: '常见',
    description: '打印件角落或边缘从热床上翘起，严重时模型整体脱落。',
    causes: ['热床温度不足', '调平不准确', '环境温差过大', '模型底面积太小'],
    solutions: [
      {
        step: 1,
        title: '重新调平热床',
        detail: '使用A4纸（约0.1mm厚）在喷嘴与热床之间校准间距。四个角及中心点都要检查，确保阻力一致。'
      },
      {
        step: 2,
        title: '提高热床温度',
        detail: 'PLA建议设置热床温度到 60–70°C；ABS 需要 100–110°C。温度不足是翘边最常见原因之一。'
      },
      {
        step: 3,
        title: '开启 Brim（裙边）',
        detail: '在切片软件中开启 Brim，宽度设置为 5–10mm，可以显著增加底面附着面积。'
      },
      {
        step: 4,
        title: '降低或关闭风扇',
        detail: '打印 ABS 时关闭冷却风扇，打印 PLA 时可将第一层风扇速度降至 0%。'
      },
      {
        step: 5,
        title: '增加热床附着力',
        detail: '在玻璃热床上涂固体胶棒或发胶喷雾，待干后效果极佳。PEI 弹簧钢板也是长期解决方案。'
      },
      {
        step: 6,
        title: '降低第一层速度',
        detail: '第一层打印速度建议设为 20–30mm/s，让耗材有充足时间与热床粘合。'
      }
    ],
    tips: 'ABS翘边严重时，建议用纸板或亚克力板做一个简单的封闭打印箱，减少环境温差影响。'
  },
  {
    id: 'stringing',
    category: '新手',
    title: '拉丝现象',
    subtitle: '模型间出现细线',
    emoji: '🕸',
    color: '#FFB347',
    bgGradient: 'linear-gradient(135deg, #1a1000 0%, #2d1f00 100%)',
    difficulty: '常见',
    description: '喷嘴在空走时拖出细丝，在模型不同部分之间形成蜘蛛网状丝线。',
    causes: ['温度过高导致耗材流动性过强', '回抽设置不足', '移动速度过慢', '耗材受潮'],
    solutions: [
      {
        step: 1,
        title: '开启并调整回抽',
        detail: '直驱机型回抽距离建议 1–3mm；Bowden（远端进丝）机型建议 4–7mm。回抽速度 25–45mm/s。'
      },
      {
        step: 2,
        title: '降低打印温度',
        detail: '每次降低 5°C 测试，直到拉丝消失。温度越高，耗材越稀，越容易拉丝。'
      },
      {
        step: 3,
        title: '提高移动速度',
        detail: '将空移速度（Travel Speed）提高到 150–200mm/s，减少喷嘴悬空时的渗漏时间。'
      },
      {
        step: 4,
        title: '开启 Combing 走线优化',
        detail: '在 Cura 中开启 Combing 模式（梳理），让空走路径尽量通过已打印区域内部，避免外露拉丝。'
      },
      {
        step: 5,
        title: '检查耗材是否受潮',
        detail: '受潮耗材在打印时会发出"噼啪"声，并严重拉丝。放入食品干燥箱或烤箱（55°C）烘干4–6小时。'
      }
    ],
    tips: '回抽距离不是越大越好，过大会导致堵头。建议每次调整0.5mm并打测试件观察效果。'
  },
  {
    id: 'layer-separation',
    category: '新手',
    title: '层间开裂',
    subtitle: '层与层之间分离',
    emoji: '💔',
    color: '#FF6B9D',
    bgGradient: 'linear-gradient(135deg, #1a0010 0%, #2d001a 100%)',
    difficulty: '常见',
    description: '打印层与层之间粘合不牢，出现明显的分层或裂缝，模型强度很差。',
    causes: ['打印温度过低', '层高设置过大', '打印速度过快', '耗材受潮'],
    solutions: [
      {
        step: 1,
        title: '提高打印温度',
        detail: '层间粘合需要足够高的温度。PLA 建议 200–220°C，PETG 建议 230–245°C，ABS 建议 230–250°C。'
      },
      {
        step: 2,
        title: '减小层高',
        detail: '层高不应超过喷嘴直径的75%。0.4mm喷嘴最大层高建议0.28mm，过大会导致层间粘合不足。'
      },
      {
        step: 3,
        title: '降低打印速度',
        detail: '速度过快时耗材来不及充分熔融粘合。尝试将速度降低 20–30% 观察改善效果。'
      },
      {
        step: 4,
        title: '检查耗材流量（Flow Rate）',
        detail: '确认切片软件中的挤出量（Flow Rate）设置为 100%，欠挤出会直接导致层间粘合弱。'
      }
    ],
    tips: '如果温度已经很高还是开裂，重点检查耗材是否受潮，受潮耗材即使温度合适也无法良好粘合。'
  },
  {
    id: 'under-extrusion',
    category: '新手',
    title: '欠挤出',
    subtitle: '打印线条缺失稀疏',
    emoji: '🫧',
    color: '#74B9FF',
    bgGradient: 'linear-gradient(135deg, #000f1a 0%, #001a2d 100%)',
    difficulty: '中等',
    description: '打印出的线条不连续，墙体有空洞，表面粗糙有缺口，强度明显不足。',
    causes: ['喷嘴部分堵塞', '挤出机齿轮打滑', '温度不足', '打印速度过快'],
    solutions: [
      {
        step: 1,
        title: '冷拔清洁喷嘴',
        detail: '将喷嘴加热到正常温度，手动推入少量耗材，然后降温到55°C左右，用力向外拔出，反复几次清理残留。'
      },
      {
        step: 2,
        title: '检查挤出机齿轮',
        detail: '查看齿轮是否打滑或磨损，将耗材端头剪断重新装入，确保齿轮能咬紧耗材。'
      },
      {
        step: 3,
        title: '调整挤出量（Flow Rate）',
        detail: '在切片软件中将 Flow Rate 提高到 105–110%，或在打印机屏幕上实时调整挤出倍率。'
      },
      {
        step: 4,
        title: '提高温度或降低速度',
        detail: '温度每提高5°C可改善流动性；速度每降低10mm/s可给挤出机更多时间输送耗材。'
      }
    ],
    tips: '长期欠挤出往往是喷嘴积碳的信号，建议每隔1–2个月用原子拔（Atomic Pull）清洁一次喷嘴。'
  },
  {
    id: 'over-extrusion',
    category: '新手',
    title: '过挤出',
    subtitle: '表面鼓包溢出',
    emoji: '💦',
    color: '#00CEC9',
    bgGradient: 'linear-gradient(135deg, #001a1a 0%, #002d2d 100%)',
    difficulty: '常见',
    description: '挤出耗材过多，导致线条相互挤压，表面出现鼓包、溢出和尺寸偏大。',
    causes: ['Flow Rate设置过高', '未做E-step校准', '温度过高', '速度过慢'],
    solutions: [
      {
        step: 1,
        title: '校准挤出步进（E-step）',
        detail: '在耗材上标记100mm，让打印机挤出100mm，测量实际挤出长度，按比例调整E-step值。'
      },
      {
        step: 2,
        title: '降低 Flow Rate',
        detail: '将切片软件中的 Flow Rate 降低到 95% 尝试，如果还有鼓包继续降低直到表面平整。'
      },
      {
        step: 3,
        title: '适当降低温度',
        detail: '温度过高耗材流动性强，容易溢出。每次降低5°C并观察效果，不要一次降太多。'
      }
    ],
    tips: '打印前建议打一个单壁测试方块（Calibration Cube），通过测量实际尺寸来判断是否存在过挤出问题。'
  },
  {
    id: 'clogged-nozzle',
    category: '进阶',
    title: '喷嘴堵塞',
    subtitle: '无法正常出丝',
    emoji: '🚫',
    color: '#A29BFE',
    bgGradient: 'linear-gradient(135deg, #0d001a 0%, #1a002d 100%)',
    difficulty: '需处理',
    description: '喷嘴完全或部分堵塞，耗材无法正常挤出，打印中断或严重欠挤出。',
    causes: ['更换了不兼容耗材', '温度过低打印', '异物进入喷嘴', '长期积碳'],
    solutions: [
      {
        step: 1,
        title: '尝试热拔清洁',
        detail: '加热到打印温度，手动从进料口推入耗材，让残留物从喷嘴挤出。换用新耗材重复几次。'
      },
      {
        step: 2,
        title: '原子拔（Atomic Pull）',
        detail: '加热到 200°C 推入 PTFE 耗材，缓慢冷却到 90°C 左右用力拔出，残留物会附着在耗材端头被拔出。重复 3–5 次。'
      },
      {
        step: 3,
        title: '喷嘴疏通针',
        detail: '喷嘴加热状态下，用0.3mm以下的细针从喷嘴端插入疏通。注意安全，不要伤到手。'
      },
      {
        step: 4,
        title: '更换喷嘴',
        detail: '如以上方法无效，黄铜喷嘴价格低廉（10–30元），直接更换是最快的解决方案。建议备几个常用规格。'
      }
    ],
    tips: '避免堵嘴最好的方法是：更换耗材时彻底清除旧料；不要在低于推荐温度下打印；定期原子拔保养。'
  },
  {
    id: 'elephant-foot',
    category: '新手',
    title: '象脚效应',
    subtitle: '底层向外扩展',
    emoji: '🐘',
    color: '#55EFC4',
    bgGradient: 'linear-gradient(135deg, #001a0f 0%, #002d1a 100%)',
    difficulty: '常见',
    description: '打印件底部1–3层向外扩展，导致底面尺寸偏大、边缘不直，影响零件配合精度。',
    causes: ['热床温度过高', '第一层过度挤压', '冷却不及时', 'Flow Rate偏高'],
    solutions: [
      {
        step: 1,
        title: '略微降低热床温度',
        detail: '热床温度过高会让底层耗材持续过软。PLA热床尝试降低5°C，ABS可酌情降低。'
      },
      {
        step: 2,
        title: '减小第一层挤出量',
        detail: '在 Cura 中单独设置第一层 Flow Rate 为 90–95%，减少底层过度挤出。'
      },
      {
        step: 3,
        title: '在切片中设置象脚补偿',
        detail: 'Cura 的 "Elephant Foot Compensation" 参数可以自动内缩底层轮廓，建议从 0.1mm 开始尝试。'
      },
      {
        step: 4,
        title: '调整喷嘴与热床距离',
        detail: '喷嘴太低会将耗材向外挤压形成象脚。适当调高热床或增大Z轴偏移量。'
      }
    ],
    tips: '象脚效应在需要精确配合的零件（如卡扣、轴孔）时影响最大，建议打测试件后再打正式零件。'
  },
  {
    id: 'ghosting',
    category: '进阶',
    title: '振纹 / 鬼影',
    subtitle: '表面出现波纹震动痕',
    emoji: '👻',
    color: '#FD79A8',
    bgGradient: 'linear-gradient(135deg, #1a000d 0%, #2d0018 100%)',
    difficulty: '进阶',
    description: '在急速转向或锐角之后，表面出现波浪状重复纹路，影响外观品质。',
    causes: ['打印速度过快', '加速度设置过高', '机器框架松动', '皮带过松'],
    solutions: [
      {
        step: 1,
        title: '降低打印速度',
        detail: '将整体打印速度降低到 40–60mm/s，急速转向产生的冲击力减小，振纹会明显减少。'
      },
      {
        step: 2,
        title: '降低加速度（Acceleration）',
        detail: '在切片软件中将加速度从默认的 3000 降低到 800–1500mm/s²，变速更平缓，减少振动。'
      },
      {
        step: 3,
        title: '检查并拧紧所有螺丝',
        detail: '框架螺丝、光轴固定螺丝如有松动会放大振动。用螺丝刀逐一检查并拧紧，不要过紧。'
      },
      {
        step: 4,
        title: '调整皮带张力',
        detail: '拨动皮带应有清脆弹响（类似吉他弦），太松会引发振纹。调节皮带张紧器至适当张力。'
      }
    ],
    tips: '高端打印机（如Bambu Lab、Voron）通过共振补偿算法（Input Shaping）可在高速下消除振纹，是终极解决方案。'
  },
  {
    id: 'wet-filament',
    category: '新手',
    title: '耗材受潮',
    subtitle: '打印噼啪声、气泡',
    emoji: '💧',
    color: '#81ECEC',
    bgGradient: 'linear-gradient(135deg, #001515 0%, #002020 100%)',
    difficulty: '常见',
    description: '耗材吸收空气中的水分，打印时水分汽化，出现噼啪声、气泡、表面粗糙和大量拉丝。',
    causes: ['耗材存放不当，未密封', '高湿度环境', '开封后长期放置', '梅雨季节'],
    solutions: [
      {
        step: 1,
        title: '烘干耗材',
        detail: 'PLA：55–65°C 烘干 4–6小时。PETG：65–70°C 烘干 4–6小时。ABS：80°C 烘干 4–5小时。用食品干燥箱或低温烤箱。'
      },
      {
        step: 2,
        title: '判断是否受潮',
        detail: '打印时听到"噼啪"爆裂声；挤出时有小气泡；表面有小凸起或条纹；颜色比正常更暗淡——以上为受潮征兆。'
      },
      {
        step: 3,
        title: '正确存储耗材',
        detail: '将耗材放入密封袋或密封箱，加入足量干燥剂（硅胶干燥剂）。最好投资一个专用的耗材干燥箱。'
      }
    ],
    tips: '一次性购买的大量耗材建议用真空压缩袋存储，并附上干燥剂。打开包装后建议在1–2周内用完或保持密封。'
  },
  {
    id: 'support-removal',
    category: '新手',
    title: '支撑难以去除',
    subtitle: '支撑与模型粘连',
    emoji: '🏗',
    color: '#FDCB6E',
    bgGradient: 'linear-gradient(135deg, #1a1000 0%, #2d1f00 100%)',
    difficulty: '常见',
    description: '支撑结构与模型融合，难以分离，去除后留下明显疤痕，损坏模型表面。',
    causes: ['支撑Z距离设置过小', '支撑密度过高', '支撑界面层设置不当'],
    solutions: [
      {
        step: 1,
        title: '增大支撑Z轴距离',
        detail: '在切片软件中找到"支撑Z距离"，增大至 0.2–0.3mm，让支撑与模型之间有更大的间隙，更容易分离。'
      },
      {
        step: 2,
        title: '降低支撑密度',
        detail: '将支撑填充密度从默认的15–20%降低到5–10%。支撑的作用是承托模型，不需要太实心。'
      },
      {
        step: 3,
        title: '使用支撑界面层',
        detail: '开启"支撑界面层"（Support Interface），界面层密度设高，但只有几层厚，兼顾支撑质量和易去除性。'
      },
      {
        step: 4,
        title: '使用可溶性支撑材料',
        detail: '双喷嘴打印机可以用 PVA 或 HIPS 打印支撑，用水或柠檬烯溶解，完全不影响模型表面。'
      }
    ],
    tips: '支撑去除时用尖嘴钳从一端撬起而非直接拉扯，用美工刀修整残留面。悬空角度小于45°的位置通常不需要支撑。'
  },
  {
    id: 'spaghetti',
    category: '新手',
    title: '意大利面打印',
    subtitle: '打印件整体坍塌',
    emoji: '🍝',
    color: '#E17055',
    bgGradient: 'linear-gradient(135deg, #1a0800 0%, #2d1200 100%)',
    difficulty: '紧急',
    description: '打印件从热床或某一层脱落后，打印机继续在空气中挤出，产生乱糟糟的细丝堆。',
    causes: ['热床附着力不足导致脱落', '某层失败后继续打印', '意外碰撞模型', '打印设置错误'],
    solutions: [
      {
        step: 1,
        title: '立即停止打印',
        detail: '发现意面打印后立即按打印机上的停止键，防止更多耗材浪费和喷嘴损坏。'
      },
      {
        step: 2,
        title: '清理热床和喷嘴',
        detail: '趁热清理喷嘴周围的残留耗材，热床冷却后取下凝固的耗材团。'
      },
      {
        step: 3,
        title: '解决根本原因',
        detail: '检查热床附着力（重新调平、清洁热床）；检查切片是否有错误；检查是否有碰撞风险。'
      },
      {
        step: 4,
        title: '安装延时相机监控',
        detail: '手机架配合打印监控App（如OrcaSlicer的摄像头功能、Obico）可在失败时自动暂停，减少损失。'
      }
    ],
    tips: '长时间打印（8小时以上）最好能远程监控。失败率高的模型建议先用快速设置打一个小版本测试附着力。'
  },
  {
    id: 'z-wobble',
    category: '进阶',
    title: 'Z轴波纹',
    subtitle: '表面规律性起伏',
    emoji: '〰️',
    color: '#6C5CE7',
    bgGradient: 'linear-gradient(135deg, #08001a 0%, #10002d 100%)',
    difficulty: '进阶',
    description: '表面出现规律性的周期波纹，通常每隔固定高度（等于丝杆螺距）重复出现。',
    causes: ['丝杆弯曲或偏心', '丝杆螺母安装不正', 'Z轴导轨不垂直', '联轴器松动'],
    solutions: [
      {
        step: 1,
        title: '检查丝杆是否弯曲',
        detail: '将丝杆取下，放在平面上滚动，观察是否有明显的弯曲跳动。弯曲的丝杆需要更换。'
      },
      {
        step: 2,
        title: '检查并重新固定联轴器',
        detail: '联轴器连接电机轴和丝杆，松动会产生周期性误差。确认两侧螺丝都已锁紧。'
      },
      {
        step: 3,
        title: '润滑丝杆和光轴',
        detail: '用白锂脂或专用3D打印机润滑油润滑丝杆螺纹和光轴，减少运动阻力和摩擦引发的抖动。'
      },
      {
        step: 4,
        title: '检查Z轴导轨垂直度',
        detail: '用直角尺检查Z轴导轨是否与打印平台垂直，不垂直会让打印头在升降时产生横向位移。'
      }
    ],
    tips: 'Z轴波纹的特征是"周期性且规律"，如果是不规律的层纹，更可能是振纹或温度波动问题。'
  }
]

export const categories = ['全部', '新手', '进阶']
