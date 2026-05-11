// src/data/problems.js
// 3D打印常见问题数据 - 共30个问题
export const problems = [
  // ─── 新手问题 ───
  {
    id: 'warping',
    video: 'BV1vt411V74E',
    category: '新手',
    title: '打印件翘边',
    subtitle: '底部脱离热床',
    emoji: '🌀',
    color: '#FF6B6B',
    bgGradient: 'linear-gradient(135deg, #1a0a0a 0%, #2d0f0f 100%)',
    difficulty: '常见',
    description: '打印件角落或边缘从热床上翘起，严重时模型整体脱落，是新手最常遇到的问题之一。',
    causes: ['热床温度不足', '调平不准确', '环境温差过大', '模型底面积太小'],
    solutions: [
      { step: 1, title: '重新调平热床', detail: '使用A4纸（约0.1mm厚）在喷嘴与热床之间校准间距。四个角及中心点都要检查，确保阻力一致。' },
      { step: 2, title: '提高热床温度', detail: 'PLA建议设置热床温度到 60–70°C；ABS 需要 100–110°C。温度不足是翘边最常见原因之一。' },
      { step: 3, title: '开启 Brim（裙边）', detail: '在切片软件中开启 Brim，宽度设置为 5–10mm，可以显著增加底面附着面积。' },
      { step: 4, title: '降低或关闭风扇', detail: '打印 ABS 时关闭冷却风扇，打印 PLA 时可将第一层风扇速度降至 0%。' },
      { step: 5, title: '增加热床附着力', detail: '在玻璃热床上涂固体胶棒或发胶喷雾，待干后效果极佳。PEI 弹簧钢板也是长期解决方案。' },
      { step: 6, title: '降低第一层速度', detail: '第一层打印速度建议设为 20–30mm/s，让耗材有充足时间与热床粘合。' }
    ],
    tips: 'ABS翘边严重时，建议用纸板或亚克力板做一个简单的封闭打印箱，减少环境温差影响。'
  },
  {
    id: 'stringing',
    video: 'BV1af421d7r4',
    category: '新手',
    title: '拉丝现象',
    subtitle: '模型间出现细线',
    emoji: '🕸',
    color: '#FFB347',
    bgGradient: 'linear-gradient(135deg, #1a1000 0%, #2d1f00 100%)',
    difficulty: '常见',
    description: '喷嘴在空走时拖出细丝，在模型不同部分之间形成蜘蛛网状丝线，影响外观。',
    causes: ['温度过高导致耗材流动性过强', '回抽设置不足', '移动速度过慢', '耗材受潮'],
    solutions: [
      { step: 1, title: '开启并调整回抽', detail: '直驱机型回抽距离建议 1–3mm；Bowden（远端进丝）机型建议 4–7mm。回抽速度 25–45mm/s。' },
      { step: 2, title: '降低打印温度', detail: '每次降低 5°C 测试，直到拉丝消失。温度越高，耗材越稀，越容易拉丝。' },
      { step: 3, title: '提高移动速度', detail: '将空移速度（Travel Speed）提高到 150–200mm/s，减少喷嘴悬空时的渗漏时间。' },
      { step: 4, title: '开启 Combing 走线优化', detail: '在 Cura 中开启 Combing 模式，让空走路径尽量通过已打印区域内部，避免外露拉丝。' },
      { step: 5, title: '检查耗材是否受潮', detail: '受潮耗材在打印时会发出"噼啪"声，并严重拉丝。放入食品干燥箱（55°C）烘干4–6小时。' }
    ],
    tips: '回抽距离不是越大越好，过大会导致堵头。建议每次调整0.5mm并打测试件观察效果。'
  },
  {
    id: 'layer-separation',
    video: null,
    category: '新手',
    title: '层间开裂',
    subtitle: '层与层之间分离',
    emoji: '💔',
    color: '#FF6B9D',
    bgGradient: 'linear-gradient(135deg, #1a0010 0%, #2d001a 100%)',
    difficulty: '常见',
    description: '打印层与层之间粘合不牢，出现明显的分层或裂缝，模型强度很差，轻易就能掰开。',
    causes: ['打印温度过低', '层高设置过大', '打印速度过快', '耗材受潮'],
    solutions: [
      { step: 1, title: '提高打印温度', detail: 'PLA 建议 200–220°C，PETG 建议 230–245°C，ABS 建议 230–250°C。层间粘合需要足够高的温度。' },
      { step: 2, title: '减小层高', detail: '层高不应超过喷嘴直径的75%。0.4mm喷嘴最大层高建议0.28mm，过大会导致层间粘合不足。' },
      { step: 3, title: '降低打印速度', detail: '速度过快时耗材来不及充分熔融粘合。尝试将速度降低 20–30% 观察改善效果。' },
      { step: 4, title: '检查挤出量（Flow Rate）', detail: '确认切片软件中的挤出量设置为 100%，欠挤出会直接导致层间粘合弱。' }
    ],
    tips: '如果温度已经很高还是开裂，重点检查耗材是否受潮，受潮耗材即使温度合适也无法良好粘合。'
  },
  {
    id: 'under-extrusion',
    video: 'BV1sBLhzQENQ',
    category: '新手',
    title: '欠挤出',
    subtitle: '打印线条缺失稀疏',
    emoji: '🫧',
    color: '#74B9FF',
    bgGradient: 'linear-gradient(135deg, #000f1a 0%, #001a2d 100%)',
    difficulty: '中等',
    description: '打印出的线条不连续，墙体有空洞，表面粗糙有缺口，模型强度明显不足。',
    causes: ['喷嘴部分堵塞', '挤出机齿轮打滑', '温度不足', '打印速度过快'],
    solutions: [
      { step: 1, title: '冷拔清洁喷嘴', detail: '将喷嘴加热到正常温度，手动推入少量耗材，然后降温到55°C左右，用力向外拔出，反复几次清理残留。' },
      { step: 2, title: '检查挤出机齿轮', detail: '查看齿轮是否打滑或磨损，将耗材端头剪断重新装入，确保齿轮能咬紧耗材。' },
      { step: 3, title: '调整挤出量（Flow Rate）', detail: '在切片软件中将 Flow Rate 提高到 105–110%，或在打印机屏幕上实时调整挤出倍率。' },
      { step: 4, title: '提高温度或降低速度', detail: '温度每提高5°C可改善流动性；速度每降低10mm/s可给挤出机更多时间输送耗材。' }
    ],
    tips: '长期欠挤出往往是喷嘴积碳的信号，建议每隔1–2个月用原子拔（Atomic Pull）清洁一次喷嘴。'
  },
  {
    id: 'over-extrusion',
    video: 'BV1em4y1d7tL',
    category: '新手',
    title: '过挤出',
    subtitle: '表面鼓包溢出',
    emoji: '💦',
    color: '#00CEC9',
    bgGradient: 'linear-gradient(135deg, #001a1a 0%, #002d2d 100%)',
    difficulty: '常见',
    description: '挤出耗材过多，导致线条相互挤压，表面出现鼓包、溢出和尺寸偏大，影响精度。',
    causes: ['Flow Rate设置过高', '未做E-step校准', '温度过高', '速度过慢'],
    solutions: [
      { step: 1, title: '校准挤出步进（E-step）', detail: '在耗材上标记100mm，让打印机挤出100mm，测量实际挤出长度，按比例调整E-step值。' },
      { step: 2, title: '降低 Flow Rate', detail: '将切片软件中的 Flow Rate 降低到 95% 尝试，如果还有鼓包继续降低直到表面平整。' },
      { step: 3, title: '适当降低温度', detail: '温度过高耗材流动性强，容易溢出。每次降低5°C并观察效果，不要一次降太多。' }
    ],
    tips: '打印前建议打一个单壁测试方块（Calibration Cube），通过测量实际尺寸来判断是否存在过挤出问题。'
  },
  {
    id: 'elephant-foot',
    video: 'BV1xK4y147yQ',
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
      { step: 1, title: '略微降低热床温度', detail: '热床温度过高会让底层耗材持续过软。PLA热床尝试降低5°C，ABS可酌情降低。' },
      { step: 2, title: '减小第一层挤出量', detail: '在 Cura 中单独设置第一层 Flow Rate 为 90–95%，减少底层过度挤出。' },
      { step: 3, title: '使用象脚补偿参数', detail: 'Cura 的 "Elephant Foot Compensation" 参数可以自动内缩底层轮廓，建议从 0.1mm 开始尝试。' },
      { step: 4, title: '调整喷嘴与热床距离', detail: '喷嘴太低会将耗材向外挤压形成象脚。适当调高热床或增大Z轴偏移量。' }
    ],
    tips: '象脚效应在需要精确配合的零件（如卡扣、轴孔）时影响最大，建议打测试件后再打正式零件。'
  },
  {
    id: 'wet-filament',
    video: 'BV1x34y187Xn',
    category: '新手',
    title: '耗材受潮',
    subtitle: '打印噼啪声、气泡',
    emoji: '💧',
    color: '#81ECEC',
    bgGradient: 'linear-gradient(135deg, #001515 0%, #002020 100%)',
    difficulty: '常见',
    description: '耗材吸收空气中水分，打印时水分汽化，出现噼啪声、气泡、表面粗糙和大量拉丝。',
    causes: ['耗材存放不当，未密封', '高湿度环境', '开封后长期放置', '梅雨季节'],
    solutions: [
      { step: 1, title: '烘干耗材', detail: 'PLA：55–65°C 烘干 4–6小时。PETG：65–70°C 4–6小时。ABS：80°C 4–5小时。用食品干燥箱或低温烤箱。' },
      { step: 2, title: '判断是否受潮', detail: '打印时听到"噼啪"爆裂声；挤出时有小气泡；表面有小凸起；颜色比正常更暗淡——以上为受潮征兆。' },
      { step: 3, title: '正确存储耗材', detail: '将耗材放入密封袋或密封箱，加入足量硅胶干燥剂。最好投资一个专用的耗材干燥箱。' }
    ],
    tips: '一次性购买的大量耗材建议用真空压缩袋存储并附上干燥剂。打开包装后建议在1–2周内用完或保持密封。'
  },
  {
    id: 'support-removal',
    video: 'BV1U5411K71B',
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
      { step: 1, title: '增大支撑Z轴距离', detail: '在切片软件中找到"支撑Z距离"，增大至 0.2–0.3mm，让支撑与模型之间有更大间隙，更容易分离。' },
      { step: 2, title: '降低支撑密度', detail: '将支撑填充密度从默认的15–20%降低到5–10%。支撑的作用是承托模型，不需要太实心。' },
      { step: 3, title: '使用支撑界面层', detail: '开启"支撑界面层"（Support Interface），界面层密度设高，只有几层厚，兼顾支撑质量和易去除性。' },
      { step: 4, title: '使用可溶性支撑材料', detail: '双喷嘴打印机可以用 PVA 或 HIPS 打印支撑，用水或柠檬烯溶解，完全不影响模型表面。' }
    ],
    tips: '支撑去除时用尖嘴钳从一端撬起而非直接拉扯，用美工刀修整残留面。悬空角度小于45°的位置通常不需要支撑。'
  },
  {
    id: 'spaghetti',
    video: null,
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
      { step: 1, title: '立即停止打印', detail: '发现意面打印后立即按打印机上的停止键，防止更多耗材浪费和喷嘴损坏。' },
      { step: 2, title: '清理热床和喷嘴', detail: '趁热清理喷嘴周围的残留耗材，热床冷却后取下凝固的耗材团。' },
      { step: 3, title: '解决根本原因', detail: '检查热床附着力（重新调平、清洁热床）；检查切片是否有错误；检查是否有碰撞风险。' },
      { step: 4, title: '安装摄像头监控', detail: '手机配合打印监控App（如Obico）可在失败时自动暂停，减少损失。' }
    ],
    tips: '长时间打印（8小时以上）最好能远程监控。失败率高的模型建议先用快速设置打一个小版本测试附着力。'
  },
  {
    id: 'no-extrusion',
    video: 'BV1uL411u7qv',
    category: '新手',
    title: '喷嘴不出丝',
    subtitle: '开始打印无耗材挤出',
    emoji: '⛔',
    color: '#FD79A8',
    bgGradient: 'linear-gradient(135deg, #1a000d 0%, #2d0018 100%)',
    difficulty: '紧急',
    description: '打印开始后喷嘴完全没有耗材挤出，打印机在空气中运动，或者打印到一半突然停止出丝。',
    causes: ['耗材用完', '喷嘴完全堵塞', '送丝齿轮打滑', '喷嘴距热床太近'],
    solutions: [
      { step: 1, title: '检查耗材是否用完', detail: '检查线盘是否还有耗材，许多新手忘记确认这一点。同时检查耗材是否在路径中打结或卡住。' },
      { step: 2, title: '检查送丝器', detail: '观察送丝齿轮是否正常转动并咬合耗材。如果齿轮空转，说明耗材表面被磨光，需重新装料。' },
      { step: 3, title: '检查喷嘴温度', detail: 'PLA 喷嘴温度需达到 195–220°C，ABS 需要 210–230°C，温度不够耗材无法融化挤出。' },
      { step: 4, title: '调整Z轴偏移', detail: '喷嘴距热床太近会堵住出口。在打印机设置中增大Z轴偏移量（Baby Step），让喷嘴略微抬高。' },
      { step: 5, title: '清洁或更换喷嘴', detail: '如以上方法均无效，喷嘴可能完全堵塞，需要进行冷拔清洁或直接更换新喷嘴（黄铜喷嘴很便宜）。' }
    ],
    tips: '打印前养成习惯：手动预热后推一下耗材，确认有丝挤出再开始打印，可避免大多数"空打"问题。'
  },
  {
    id: 'first-layer-not-sticking',
    video: 'BV1rj421Q7gR',
    category: '新手',
    title: '第一层不粘床',
    subtitle: '耗材粘不上热床',
    emoji: '🫠',
    color: '#A29BFE',
    bgGradient: 'linear-gradient(135deg, #0d001a 0%, #1a002d 100%)',
    difficulty: '常见',
    description: '第一层耗材无法粘附在热床上，被喷嘴带着走，或者打印几层后整体脱落。',
    causes: ['热床未清洁有油脂', '调平不准确', '热床温度不足', '打印速度过快'],
    solutions: [
      { step: 1, title: '清洁热床表面', detail: '用酒精（异丙醇IPA）擦拭热床，去除手油和灰尘。每次打印前都应清洁，手油是粘床最大的敌人。' },
      { step: 2, title: '重新调平', detail: '喷嘴与热床间距应为约0.1mm（A4纸厚），用纸张测试时应感到轻微阻力。间距不对是不粘床最常见原因。' },
      { step: 3, title: '提高热床温度', detail: 'PLA 热床 60–65°C，PETG 热床 70–85°C，ABS 热床 100–110°C。冷热床基本不可能粘住。' },
      { step: 4, title: '降低第一层速度', detail: '第一层建议打印速度设为正常速度的 25–50%，给耗材充足时间附着在热床上。' }
    ],
    tips: 'PEI弹簧钢板是解决粘床问题的终极方案，热床时粘住、冷却后自动脱落，强烈推荐新手投资一块。'
  },
  {
    id: 'layer-shift',
    video: 'BV1jQ5nzuEe5',
    category: '新手',
    title: '层移位 / 打印错位',
    subtitle: '某层突然偏移',
    emoji: '↔️',
    color: '#6C5CE7',
    bgGradient: 'linear-gradient(135deg, #08001a 0%, #10002d 100%)',
    difficulty: '中等',
    description: '打印到某一层时，模型突然向一侧偏移，之后的层仍然正常打印，导致模型扭曲变形。',
    causes: ['打印速度过快电机丢步', '皮带过松', '喷嘴碰到模型', '电源电压不稳'],
    solutions: [
      { step: 1, title: '降低打印速度', detail: '将打印速度降低至 40–60mm/s，减少电机丢步风险。速度过快是层移位最常见的原因。' },
      { step: 2, title: '检查并调整皮带张力', detail: '拨动皮带应有清脆弹响（类似吉他弦），太松容易丢步导致错位。调节皮带张紧器至适当张力。' },
      { step: 3, title: '降低加速度', detail: '在切片软件中将加速度从默认的 3000 降低到 1000–2000mm/s²，减少急加速时的电机负担。' },
      { step: 4, title: '检查喷嘴是否撞模型', detail: '如果模型某处有翘起或积瘤，会挡住喷嘴路径造成撞击错位。开启Z-Hop（抬头）可以避免。' }
    ],
    tips: '发生层移位后不必重打，记录层号，分析该层有什么特征（大面积、高速转向）来定位原因。'
  },

  // ─── 进阶问题 ───
  {
    id: 'clogged-nozzle',
    video: 'BV1Sa4y1a7Ad',
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
      { step: 1, title: '尝试热拔清洁', detail: '加热到打印温度，手动从进料口推入耗材，让残留物从喷嘴挤出。换用新耗材重复几次。' },
      { step: 2, title: '原子拔（Atomic Pull）', detail: '加热到 200°C 推入耗材，缓慢冷却到 90°C 左右用力拔出，残留物会附着在耗材端头被拔出。重复 3–5 次。' },
      { step: 3, title: '喷嘴疏通针', detail: '喷嘴加热状态下，用0.3mm以下的细针从喷嘴端插入疏通。注意安全，不要伤到手。' },
      { step: 4, title: '更换喷嘴', detail: '如以上方法无效，黄铜喷嘴价格低廉（10–30元），直接更换是最快的解决方案。建议备几个常用规格。' }
    ],
    tips: '避免堵嘴最好的方法：更换耗材时彻底清除旧料；不要在低于推荐温度下打印；定期原子拔保养。'
  },
  {
    id: 'ghosting',
    video: 'BV1dA411n7fg',
    category: '进阶',
    title: '振纹 / 鬼影',
    subtitle: '表面出现波纹震动痕',
    emoji: '👻',
    color: '#FD79A8',
    bgGradient: 'linear-gradient(135deg, #1a000d 0%, #2d0018 100%)',
    difficulty: '进阶',
    description: '在急速转向或锐角之后，表面出现波浪状重复纹路，影响外观品质，高速打印更明显。',
    causes: ['打印速度过快', '加速度设置过高', '机器框架松动', '皮带过松'],
    solutions: [
      { step: 1, title: '降低打印速度', detail: '将整体打印速度降低到 40–60mm/s，急速转向产生的冲击力减小，振纹会明显减少。' },
      { step: 2, title: '降低加速度', detail: '在切片软件中将加速度从默认的 3000 降低到 800–1500mm/s²，变速更平缓，减少振动。' },
      { step: 3, title: '检查并拧紧所有螺丝', detail: '框架螺丝、光轴固定螺丝如有松动会放大振动。用螺丝刀逐一检查并拧紧，不要过紧。' },
      { step: 4, title: '调整皮带张力', detail: '拨动皮带应有清脆弹响，太松会引发振纹。调节皮带张紧器至适当张力。' }
    ],
    tips: '高端打印机（如Bambu Lab）通过共振补偿算法（Input Shaping）可在高速下消除振纹，是终极解决方案。'
  },
  {
    id: 'z-wobble',
    video: 'BV1xb4y147CN',
    category: '进阶',
    title: 'Z轴波纹',
    subtitle: '表面规律性起伏',
    emoji: '〰️',
    color: '#6C5CE7',
    bgGradient: 'linear-gradient(135deg, #08001a 0%, #10002d 100%)',
    difficulty: '进阶',
    description: '表面出现规律性的周期波纹，通常每隔固定高度（等于丝杆螺距）重复出现，像螺旋纹路。',
    causes: ['丝杆弯曲或偏心', '丝杆螺母安装不正', 'Z轴导轨不垂直', '联轴器松动'],
    solutions: [
      { step: 1, title: '检查丝杆是否弯曲', detail: '将丝杆取下，放在平面上滚动，观察是否有明显的弯曲跳动。弯曲的丝杆需要更换。' },
      { step: 2, title: '检查并重新固定联轴器', detail: '联轴器连接电机轴和丝杆，松动会产生周期性误差。确认两侧螺丝都已锁紧。' },
      { step: 3, title: '润滑丝杆和光轴', detail: '用白锂脂或专用3D打印机润滑油润滑丝杆螺纹和光轴，减少运动阻力和摩擦引发的抖动。' },
      { step: 4, title: '检查Z轴导轨垂直度', detail: '用直角尺检查Z轴导轨是否与打印平台垂直，不垂直会让打印头在升降时产生横向位移。' }
    ],
    tips: 'Z轴波纹的特征是"周期性且规律"，如果是不规律的层纹，更可能是振纹或温度波动问题。'
  },
  {
    id: 'heat-creep',
    video: null,
    category: '进阶',
    title: '热爬升（Heat Creep）',
    subtitle: '耗材在冷端熔化堵塞',
    emoji: '🌡️',
    color: '#FF7675',
    bgGradient: 'linear-gradient(135deg, #1a0500 0%, #2d0a00 100%)',
    difficulty: '需处理',
    description: '热量从喷嘴沿喉管向上传导，导致耗材在冷端过早熔化，形成软塞堵塞进料路径，打印中途停止出丝。',
    causes: ['散热风扇失效或堵塞', 'PTFE管损坏或松动', '散热片安装不到位', '长时间低速打印'],
    solutions: [
      { step: 1, title: '检查散热风扇', detail: '确认热端散热风扇是否在打印时正常运转。风扇停转是热爬升最直接的原因，更换风扇即可解决。' },
      { step: 2, title: '检查PTFE管', detail: '检查PTFE管是否紧密插入热端直到喷嘴，有间隙会导致耗材在间隙处熔化堆积，造成堵塞。' },
      { step: 3, title: '清洁散热片', detail: '散热片上积累的灰尘和耗材碎屑会影响散热效果。用气枪或软刷清洁散热片间隙。' },
      { step: 4, title: '降低打印间隙温度', detail: '减少长时间在高温下的等待（如打印暂停）。等待时让喷嘴温度降低，减少热量传导时间。' }
    ],
    tips: '全金属热端（All-Metal Hotend）可以彻底解决热爬升问题，但需要更高的打印温度，不适合打PLA。'
  },
  {
    id: 'bowden-issues',
    video: null,
    category: '进阶',
    title: 'Bowden管问题',
    subtitle: '远端进丝系统故障',
    emoji: '🔩',
    color: '#74B9FF',
    bgGradient: 'linear-gradient(135deg, #000f1a 0%, #001a2d 100%)',
    difficulty: '进阶',
    description: 'Bowden（远端进丝）机型特有的问题，包括PTFE管松动、接头漏气、回抽不足等，导致打印质量下降。',
    causes: ['PTFE管接头松动', '管内有间隙', '回抽距离设置不足', 'PTFE管老化变形'],
    solutions: [
      { step: 1, title: '检查并锁紧接头', detail: '检查PTFE管两端的快接头，向内推紧后再拔试验，确保锁定。松动的接头会导致间隙堆料。' },
      { step: 2, title: '增大回抽距离', detail: 'Bowden机型由于管道较长，回抽距离需要更大：建议 5–7mm，速度 40–60mm/s。' },
      { step: 3, title: '更换PTFE管', detail: '老化的PTFE管内壁会磨损变粗糙，阻力增大。建议每6–12个月更换一次，使用Capricorn高精度管效果更好。' },
      { step: 4, title: '检查管道全程无弯折', detail: 'PTFE管弯曲角度过大（小于90°）会增加摩擦阻力，导致送料不稳定。整理管道路径，保持平缓弯曲。' }
    ],
    tips: '如果经常为Bowden系统问题所困扰，可以考虑升级为直驱（Direct Drive）挤出机，能从根本上解决大多数此类问题。'
  },
  {
    id: 'striation',
    video: null,
    category: '进阶',
    title: '温度波动条纹',
    subtitle: '表面出现水平明暗条纹',
    emoji: '📊',
    color: '#FDCB6E',
    bgGradient: 'linear-gradient(135deg, #1a1000 0%, #2d1f00 100%)',
    difficulty: '进阶',
    description: '模型表面出现周期性的明暗水平条纹，通常与Z轴波纹不同，不是规律的机械波纹而是颜色/光泽差异。',
    causes: ['PID温控参数未校准', '热端温度波动', '冷却风扇转速不稳定', '电源电压不稳'],
    solutions: [
      { step: 1, title: '运行PID自动调整', detail: '在打印机控制界面执行 PID Tune 命令，让打印机自动校准加热参数，使温度更稳定。' },
      { step: 2, title: '检查加热棒和热敏电阻', detail: '加热棒或热敏电阻松动会导致温度读数不准确，出现波动。检查固定螺丝是否锁紧。' },
      { step: 3, title: '稳定风扇转速', detail: '冷却风扇转速突变会直接影响温度，进而影响挤出量。设置固定风扇速度（不使用渐变）可以减少波动。' },
      { step: 4, title: '更换质量更好的电源', detail: '电源电压不稳定会直接导致加热棒功率变化，劣质电源是温度波动的常见根源。' }
    ],
    tips: '可以用手机或OctoEverywhere观察温度曲线，如果温度波动超过±2°C就需要重新做PID调整。'
  },
  {
    id: 'bed-adhesion-petg',
    video: 'BV1eK4113761',
    category: '进阶',
    title: 'PETG粘床过紧',
    subtitle: '打印件难以取下',
    emoji: '😤',
    color: '#55EFC4',
    bgGradient: 'linear-gradient(135deg, #001a0f 0%, #002d1a 100%)',
    difficulty: '进阶',
    description: 'PETG耗材与PEI等热床表面粘合过于牢固，冷却后无法正常取下，强行取下会损坏热床表面。',
    causes: ['PETG对PEI粘合性过强', '热床温度设置过高', '第一层压得太实'],
    solutions: [
      { step: 1, title: '降低热床温度', detail: 'PETG 热床温度建议 70–80°C 即可，过高会导致粘合过紧。很多人误以为温度越高越好。' },
      { step: 2, title: '使用隔离层', detail: '在PEI板上薄涂一层固体胶棒，形成隔离层，可以防止PETG直接与PEI反应，取下更容易。' },
      { step: 3, title: '等待完全冷却', detail: '让打印件完全冷却到室温再取下，PETG冷却后收缩，自然会与热床分离，不要着急。' },
      { step: 4, title: '调高Z轴偏移', detail: '第一层不需要压得很实，适当提高Z轴偏移（Baby Step）减少第一层与热床的接触强度。' }
    ],
    tips: '如果PETG已经死死粘在PEI上，可以将整块弹簧钢板放入冰箱冷冻10分钟，热胀冷缩会帮助分离，不要强行撬。'
  },
  {
    id: 'infill-showing',
    video: null,
    category: '进阶',
    title: '内部填充透出表面',
    subtitle: '表面能看到内部结构',
    emoji: '🫙',
    color: '#E17055',
    bgGradient: 'linear-gradient(135deg, #1a0800 0%, #2d1200 100%)',
    difficulty: '进阶',
    description: '打印件外表面能看到内部填充图案（如蜂窝、三角形），表面粗糙且美观性差。',
    causes: ['顶层/底层厚度不足', '填充密度过高影响顶层', '顶层过挤出', '冷却不足'],
    solutions: [
      { step: 1, title: '增加顶层/底层层数', detail: '将顶层和底层厚度增加到至少 4–6 层（约0.8–1.2mm）。层数不足会导致填充纹路透出。' },
      { step: 2, title: '使用光滑填充图案', detail: '将顶层填充图案改为"同心圆"（Concentric）或"之字形"（Zigzag），比直线更不容易透出。' },
      { step: 3, title: '适当提高填充密度', detail: '填充密度太低（如 10%）顶层跨度太大，支撑不足容易下陷。建议至少 15–20%。' },
      { step: 4, title: '降低顶层打印速度', detail: '顶层速度过快会导致铺展不均。将顶层速度降低到 20–30mm/s，让表面更平整。' }
    ],
    tips: 'Iron（熨烫）功能可以在顶层再跑一遍加热路径，使表面更光滑，几乎能消除填充透出问题，强烈推荐开启。'
  },

  // ─── 材料专项 ───
  {
    id: 'abs-cracking',
    video: 'BV1zB4y1N7co',
    category: '材料',
    title: 'ABS 层间开裂',
    subtitle: 'ABS打印件脆裂',
    emoji: '💥',
    color: '#FF6B6B',
    bgGradient: 'linear-gradient(135deg, #1a0a0a 0%, #2d0f0f 100%)',
    difficulty: '中等',
    description: 'ABS打印件在冷却过程中出现层间裂缝，模型各处开裂，是ABS最常见的打印问题。',
    causes: ['环境温度过低冷却过快', '打印温度不足', '未使用封闭打印箱', '风扇速度过大'],
    solutions: [
      { step: 1, title: '制作封闭打印箱', detail: '用纸箱或购买商业打印箱封闭打印环境，维持箱内温度在 40–50°C，是解决ABS开裂最有效的方法。' },
      { step: 2, title: '提高打印温度', detail: 'ABS 建议打印温度 230–250°C，热床 100–110°C。温度不足导致层间粘合弱，容易开裂。' },
      { step: 3, title: '关闭冷却风扇', detail: 'ABS 打印时必须关闭冷却风扇。急速冷却会导致内应力集中，产生裂纹。' },
      { step: 4, title: '降低打印速度', detail: '速度越慢，每层有更长时间在热环境中保温，层间粘合更好。建议 30–50mm/s。' }
    ],
    tips: 'ABS打印时气味较大，建议在通风良好的环境中或配合HEPA过滤器使用，保护健康。可以考虑用ASA代替ABS，性能相近但更易打印。'
  },
  {
    id: 'petg-stringing',
    video: 'BV1TRP5z2Em1',
    category: '材料',
    title: 'PETG 严重拉丝',
    subtitle: 'PETG耗材拉丝难处理',
    emoji: '🍬',
    color: '#74B9FF',
    bgGradient: 'linear-gradient(135deg, #000f1a 0%, #001a2d 100%)',
    difficulty: '中等',
    description: 'PETG由于其粘性高的特性，比PLA更容易拉丝，即使已经设置了回抽，拉丝问题仍然存在。',
    causes: ['PETG天然高粘性', '温度过高', '回抽距离不够', '移动速度过慢'],
    solutions: [
      { step: 1, title: '降低打印温度', detail: 'PETG 在较低温度下流动性减弱，拉丝会减少。从 240°C 开始每次降低 5°C 测试，通常 230–235°C 效果较好。' },
      { step: 2, title: '增大回抽距离', detail: 'PETG 因粘性高，需要比PLA更大的回抽。直驱建议 1–2mm，Bowden 建议 4–6mm。' },
      { step: 3, title: '提高移动速度', detail: '将空移速度提高到 150–200mm/s，减少喷嘴悬空时间，降低渗漏量。' },
      { step: 4, title: '开启Z-Hop（抬头移动）', detail: '空移时喷嘴抬高 0.2–0.4mm，避免喷嘴擦过已打印表面时粘带细丝。' }
    ],
    tips: 'PETG 不能完全消除拉丝，只能减少。打印后用热风枪快速扫过表面（不超过200°C），可以去除大部分细丝。'
  },
  {
    id: 'tpu-printing',
    video: 'BV1bC4y187BS',
    category: '材料',
    title: 'TPU 柔性料进料困难',
    subtitle: '软性耗材送料卡顿',
    emoji: '🧸',
    color: '#FDCB6E',
    bgGradient: 'linear-gradient(135deg, #1a1000 0%, #2d1f00 100%)',
    difficulty: '进阶',
    description: 'TPU等柔性耗材因为软性特点容易在挤出机处弯折堆积，导致进料不稳定，打印失败率高。',
    causes: ['挤出机与喉管间有间隙', '送丝张力过大', '打印速度过快', 'Bowden管间隙过大'],
    solutions: [
      { step: 1, title: '降低打印速度', detail: 'TPU 建议打印速度 20–30mm/s，速度过快柔性料来不及弯曲进入，容易在入口处堆积。' },
      { step: 2, title: '减小回抽或关闭回抽', detail: 'TPU 建议回抽距离 0–1mm，甚至完全关闭。过大的回抽会让软料在喉管处弯折堆积。' },
      { step: 3, title: '消除进料路径间隙', detail: '确保PTFE管插入热端直到喷嘴底部，没有任何间隙，柔性料很容易在间隙处打结。' },
      { step: 4, title: '使用直驱挤出机', detail: 'Bowden 机型打印TPU非常困难，建议升级为直驱挤出机（Direct Drive），路径短，送料更可控。' }
    ],
    tips: '打印TPU前，先在挤出机入口处用一小段导管辅助引料，避免软料弯曲。Shore A 95以上的硬度TPU相对容易打印。'
  },
  {
    id: 'pla-brittle',
    video: 'BV1XG411P7AJ',
    category: '材料',
    title: 'PLA 打印件脆化',
    subtitle: '模型轻易断裂',
    emoji: '🫚',
    color: '#55EFC4',
    bgGradient: 'linear-gradient(135degree, #001a0f 0%, #002d1a 100%)',
    difficulty: '中等',
    description: 'PLA 打印件强度不足，轻易就能掰断，薄壁处尤其脆弱，无法满足功能性使用需求。',
    causes: ['壁厚设置不足', '填充密度过低', '层间粘合弱', '耗材本身质量差'],
    solutions: [
      { step: 1, title: '增加壁厚', detail: '将外壁数量从默认2层增加到3–4层，壁厚 1.2–1.6mm，显著提升强度。' },
      { step: 2, title: '提高填充密度', detail: '功能性零件建议填充密度 40–100%，不能仅为节省耗材使用 15% 填充。' },
      { step: 3, title: '提高打印温度', detail: '适当提高温度（+5–10°C）改善层间粘合。温度越高，分子链熔合越好，强度越大。' },
      { step: 4, title: '改用更强的材料', detail: '如果需要功能性强度，考虑改用 PETG（韧性更好）、ABS 或 ASA（耐热）代替PLA。' }
    ],
    tips: '打印方向对强度影响巨大。受力方向应与层叠方向垂直（即沿X/Y方向受力），而非沿Z轴方向受力，这样强度会高出数倍。'
  },

  // ─── 切片/软件 ───
  {
    id: 'seam-visible',
    video: 'BV1RM41167om',
    category: '切片',
    title: '起始点接缝明显',
    subtitle: '外壁有明显接缝疤痕',
    emoji: '🔎',
    color: '#A29BFE',
    bgGradient: 'linear-gradient(135deg, #0d001a 0%, #1a002d 100%)',
    difficulty: '中等',
    description: '模型外壁每层的起始点在同一位置，形成一条从底到顶的竖线疤痕，影响外观质量。',
    causes: ['接缝位置设置不当', '回抽不足导致接缝溢料', '打印速度不均匀'],
    solutions: [
      { step: 1, title: '修改接缝位置', detail: '在切片软件中将接缝设置为"随机"（Random）或"最小可见处"（Sharpest Corner），避免接缝集中在一处。' },
      { step: 2, title: '开启接缝隐藏', detail: '选择"对齐到最尖锐的角"（Sharpest Corner）设置，将接缝藏在模型的棱角处，从正面看不见。' },
      { step: 3, title: '调整回抽参数', detail: '在接缝处增大回抽量（Seam Retraction）可以减少接缝处的溢料鼓包。' },
      { step: 4, title: '调整Wipe距离', detail: '增大Wipe（擦拭）距离，让喷嘴在接缝处额外移动一小段，消耗掉多余的耗材。' }
    ],
    tips: '如果对外观要求很高，可以将接缝设置在模型背面或不显眼处，并在切片时手动指定接缝位置（Cura 支持此功能）。'
  },
  {
    id: 'top-surface-rough',
    video: null,
    category: '切片',
    title: '顶面粗糙不平',
    subtitle: '顶层表面质量差',
    emoji: '🗻',
    color: '#E17055',
    bgGradient: 'linear-gradient(135deg, #1a0800 0%, #2d1200 100%)',
    difficulty: '中等',
    description: '打印件顶部表面粗糙、有孔洞或波浪状，无法达到光滑平整的外观效果。',
    causes: ['顶层层数不足', '冷却不足', '过挤出导致堆积', '速度过快'],
    solutions: [
      { step: 1, title: '增加顶层厚度', detail: '顶层至少设置 4–6 层，建议总厚度不低于 0.8mm，层数不足是顶面粗糙最常见原因。' },
      { step: 2, title: '开启Iron（熨烫）功能', detail: 'Cura 的 Iron 功能会在顶层额外跑一遍，用低流量高温将顶面"熨平"，效果非常好。' },
      { step: 3, title: '降低顶层打印速度', detail: '顶层速度降低到 20–30mm/s，让耗材有时间均匀铺展，减少空洞和波浪。' },
      { step: 4, title: '确保充分冷却', detail: '顶层打印时冷却风扇应开到最大，让每层在下一层打印前充分固化，防止塌陷。' }
    ],
    tips: '顶面质量受多种因素影响，建议将顶面改为对齐到最后一层填充的方向（如都用直线），整体效果会更统一。'
  },
  {
    id: 'overhangs-drooping',
    video: 'BV1La76zvELY',
    category: '切片',
    title: '悬空下垂',
    subtitle: '悬空结构打印质量差',
    emoji: '🌉',
    color: '#00CEC9',
    bgGradient: 'linear-gradient(135deg, #001a1a 0%, #002d2d 100%)',
    difficulty: '中等',
    description: '超过45°的悬空结构出现下垂、毛边或坍塌，桥接（Bridging）结构下方有严重垂丝现象。',
    causes: ['悬空角度超过打印机极限', '冷却不足', '速度过快', '打印温度过高'],
    solutions: [
      { step: 1, title: '加强冷却', detail: '悬空和桥接时冷却至关重要，将风扇速度提高到100%，让耗材在落下前迅速固化。' },
      { step: 2, title: '调整模型摆放方向', detail: '在切片软件中旋转模型，将悬空部分转变为支撑面，从根本上消除悬空问题。' },
      { step: 3, title: '添加支撑', detail: '对超过50°的悬空部分添加支撑，优化支撑设置使其易于去除。' },
      { step: 4, title: '降低温度和速度', detail: '悬空处降低打印温度5–10°C，速度降低20–30%，让每根丝在接触空气时更快固化。' }
    ],
    tips: '大多数打印机可以无支撑打印到45°悬空，优秀的冷却系统甚至可以处理60°。打印专用的悬空测试件来了解你的打印机极限。'
  },
  {
    id: 'bridging-poor',
    video: 'BV1M34y1F7RP',
    category: '切片',
    title: '桥接质量差',
    subtitle: '两点间横向打印下垂',
    emoji: '🌁',
    color: '#81ECEC',
    bgGradient: 'linear-gradient(135deg, #001515 0%, #002020 100%)',
    difficulty: '中等',
    description: '在两个支撑点之间横向打印时，中间的耗材向下垂落，形成松弛的曲线而非直线，影响尺寸精度。',
    causes: ['冷却不足', '桥接速度过快', '温度过高', '桥接距离太长'],
    solutions: [
      { step: 1, title: '提高风扇速度', detail: '桥接时将冷却风扇提高到 100%，是改善桥接质量最有效的单一措施。' },
      { step: 2, title: '调整桥接速度', detail: '在Cura中专门设置桥接速度（Bridge Speed）为 20–30mm/s，比正常速度慢，给冷却更多时间。' },
      { step: 3, title: '降低桥接流量', detail: '将桥接流量（Bridge Flow）降低到 50–80%，减少过多耗材下垂。' },
      { step: 4, title: '优化模型设计', detail: '超过60–80mm的桥接建议在中间增加支撑柱，或重新设计模型减小桥接跨度。' }
    ],
    tips: '打印一个桥接测试件（Bridging Test），从10mm到80mm的不同长度，可以直观了解你的打印机最大无支撑桥接能力。'
  },
  {
    id: 'dimensional-accuracy',
    video: 'BV1MD4y177sL',
    category: '切片',
    title: '尺寸精度偏差',
    subtitle: '打印件尺寸与设计不符',
    emoji: '📐',
    color: '#6C5CE7',
    bgGradient: 'linear-gradient(135deg, #08001a 0%, #10002d 100%)',
    difficulty: '进阶',
    description: '打印出的零件尺寸与CAD模型标注尺寸有偏差，孔径偏小、外径偏大，导致零件无法正常配合。',
    causes: ['未校准挤出步进（E-step）', '过挤出/欠挤出', '热膨胀系数影响', '切片软件补偿设置'],
    solutions: [
      { step: 1, title: '校准E-step', detail: '精确校准挤出机步进值是尺寸精度的基础。标记100mm耗材，挤出后测量实际值，调整步进数。' },
      { step: 2, title: '打印校准方块测量', detail: '打印20mm校准立方体，用游标卡尺测量X/Y/Z三轴实际尺寸，与理论值对比，调整步进值或Flow Rate。' },
      { step: 3, title: '使用水平扩展补偿', detail: '在Cura中设置"Horizontal Expansion"（水平扩展）为负值（如-0.1mm），补偿外壁溢出导致的尺寸偏大。' },
      { step: 4, title: '孔径补偿', detail: '孔径通常比设计值小，可在Cura中设置"Hole Horizontal Expansion"专门补偿孔径偏小的问题。' }
    ],
    tips: '对于精密配合零件，建议先打测试配合件（如轴和孔），测量后调整参数，再打正式零件，避免浪费材料。'
  },
  {
    id: 'print-pauses',
    video: 'BV1YEYTeSEW2',
    category: '切片',
    title: '打印中途暂停/中断',
    subtitle: '打印过程意外停止',
    emoji: '⏸️',
    color: '#FF7675',
    bgGradient: 'linear-gradient(135deg, #1a0500 0%, #2d0a00 100%)',
    difficulty: '中等',
    description: '打印机在打印过程中突然暂停或完全停止，没有明显报错，模型无法完成，浪费时间和耗材。',
    causes: ['USB连接中断', '电脑进入休眠', '电源功率不足', 'SD卡读写错误'],
    solutions: [
      { step: 1, title: '改用SD卡打印', detail: '通过USB线连接电脑打印时，电脑休眠或USB断连都会中断打印。改用SD卡或TF卡本地打印可彻底解决。' },
      { step: 2, title: '关闭电脑休眠', detail: '如果必须USB打印，在系统设置中禁用休眠和屏幕保护，防止电脑在打印时进入低功耗模式。' },
      { step: 3, title: '检查电源功率', detail: '电源功率不足会在加热床和喷嘴同时工作时引发过载保护。确认电源额定功率满足打印机需求。' },
      { step: 4, title: '更换SD卡', detail: '低质量SD卡在长时间读写时会出错中断。更换品牌SD卡（Class 10以上），格式化为FAT32。' }
    ],
    tips: '建议购买有断电续打（Power Loss Recovery）功能的打印机，即使意外断电也能从中断处继续打印，避免前功尽弃。'
  },
  {
    id: 'model-not-manifold',
    video: null,
    category: '切片',
    title: '模型切片错误',
    subtitle: '切片后出现缺失或异常',
    emoji: '🗂️',
    color: '#FD79A8',
    bgGradient: 'linear-gradient(135deg, #1a000d 0%, #2d0018 100%)',
    difficulty: '进阶',
    description: '从网上下载或自己建模的STL文件在切片后出现缺失面、内部空洞、随机孤立线段等问题，导致打印失败。',
    causes: ['STL文件有破面或法线错误', '模型不是封闭实体', '壁厚低于喷嘴直径', '切片软件设置问题'],
    solutions: [
      { step: 1, title: '使用Meshmixer修复', detail: '将STL文件导入 Meshmixer，使用 Analysis > Inspector 自动检测并修复破面、法线反转等问题，免费且好用。' },
      { step: 2, title: '在切片软件中开启自动修复', detail: 'Cura 会自动提示模型有问题并尝试修复，确保开启"自动修复"选项，大多数小问题能自动处理。' },
      { step: 3, title: '使用网页修复工具', detail: '将STL上传到 Netfabb Online（微软提供免费版）进行修复，对于复杂破面问题效果很好。' },
      { step: 4, title: '检查模型壁厚', detail: '部分细节特征（如薄翅、细柱）可能比喷嘴直径还小（<0.4mm），切片时会被忽略，需要在建模软件中加厚。' }
    ],
    tips: '下载模型时优先选择评分高、下载次数多的文件，这些通常经过社区验证可以正常打印。Thingiverse 和 Printables 是两个可靠的模型网站。'
  },

  // ─── 新增问题 ───
  {
    id: 'printing-noise',
    video: 'BV15kDHYHEjF',
    category: '新手',
    title: '打印机噪音过大',
    subtitle: '运行时发出异常响声',
    emoji: '🔊',
    color: '#A29BFE',
    bgGradient: 'linear-gradient(135deg, #0d001a 0%, #1a002d 100%)',
    difficulty: '常见',
    description: '打印机在运行时发出研磨声、咔哒声或强烈震动噪音，影响使用体验，有时也是设备故障的前兆。',
    causes: ['导轨或光轴缺乏润滑', '皮带张力不均', '螺丝松动导致框架共振', '挤出机齿轮磨损'],
    solutions: [
      { step: 1, title: '润滑导轨和光轴', detail: '使用白锂脂或3D打印机专用润滑脂涂抹光轴和线性导轨。每隔1–3个月润滑一次，可显著减少摩擦噪音。' },
      { step: 2, title: '调整皮带张力', detail: '拨动XY轴皮带，应发出类似吉他弦的清脆响声。太松会拍打，太紧会嗡嗡作响。通过张紧器调至适当张力。' },
      { step: 3, title: '拧紧所有框架螺丝', detail: '用螺丝刀逐一检查打印机框架、滑块和各模块的固定螺丝，松动的螺丝会在打印时产生共振噪音。' },
      { step: 4, title: '降低加速度设置', detail: '过高的加速度会产生冲击噪音。将加速度从默认3000降低到1500–2000mm/s²，噪音会明显减小。' }
    ],
    tips: '打印机下方垫一块橡皮减震垫或厚毛毡，可大幅减少桌面共振传导，在夜间打印时效果尤为明显。'
  },
  {
    id: 'filament-tangle',
    video: null,
    category: '新手',
    title: '耗材打结缠绕',
    subtitle: '线盘中途卡料断丝',
    emoji: '🎣',
    color: '#FDCB6E',
    bgGradient: 'linear-gradient(135deg, #1a1000 0%, #2d1f00 100%)',
    difficulty: '紧急',
    description: '打印途中耗材在线盘上打结缠绕，导致送料中断打印失败，严重时还会损坏挤出机齿轮。',
    causes: ['取料时未固定线头', '低质量线盘缠绕不整齐', '耗材受潮后粘连结块', '拆包时线头散乱'],
    solutions: [
      { step: 1, title: '立即停止打印解开缠结', detail: '发现卡料后立即停止打印，从线盘上轻柔解开缠结，不要暴力拉扯，以免断丝埋入线盘内部形成更深的缠结。' },
      { step: 2, title: '养成固定线头的习惯', detail: '每次换料或中断打印时，将线头穿过线盘侧面的固定孔。这是防止打结最有效的习惯，一次不到5秒。' },
      { step: 3, title: '选用整齐缠绕的线盘', detail: '低质量耗材缠绕不整齐，使用时容易打结。选择有信誉品牌的耗材，缠绕更规整，卡料概率低。' },
      { step: 4, title: '安装耗材检测传感器', detail: '耗材检测传感器在卡料断丝时会自动暂停打印，避免打印机空转损坏零件，是值得投资的配件。' }
    ],
    tips: '长时间打印时定期观察线盘，确认线头未散开。有AMS或多色系统的打印机通常内置耗材检测，打结风险更低。'
  },
  {
    id: 'color-change-fail',
    video: null,
    category: '进阶',
    title: '换色 / 多色打印失败',
    subtitle: '颜色混合或换色不干净',
    emoji: '🎨',
    color: '#FF7675',
    bgGradient: 'linear-gradient(135deg, #1a0500 0%, #2d0a00 100%)',
    difficulty: '进阶',
    description: '多色打印或手动换色时，颜色过渡不干净，出现混色、旧色残留或色块位置错误等问题。',
    causes: ['旧色耗材残留未清除干净', '清料量设置不足', '换色触发层高错误', 'AMS/换色模块故障'],
    solutions: [
      { step: 1, title: '增加换色清料量', detail: '在切片软件换色设置中增加"换色清理长度"（Purge Length）。深色换浅色时需更多清料量（通常80–150mm），否则旧色无法完全清除。' },
      { step: 2, title: '使用颜色过渡塔', detail: '在切片软件中开启"颜色过渡塔"（Purge Tower），将混色耗材集中打印在塔中而非模型上，确保模型上每种颜色干净纯正。' },
      { step: 3, title: '检查换色触发高度', detail: '确认M600换色命令在正确的层高触发，在切片预览中检查换色标记是否在正确位置，一层之差会导致颜色错位。' },
      { step: 4, title: '手动换色充分排料', detail: '手动暂停换色时，预热喷嘴后将旧料完全抽出，再装入新料推入200–400mm，确保旧色彻底排出后再继续打印。' }
    ],
    tips: '规划多色模型时尽量让颜色变化方向为"浅色→深色"，深色对浅色的遮盖力强，所需清料量少，节省耗材也节省时间。'
  },
  {
    id: 'resin-warping',
    video: 'BV1Jc411r7CW',
    category: '材料',
    printerType: 'SLA',
    title: '光固化树脂翘曲',
    subtitle: '树脂打印件固化后弯曲',
    emoji: '🌊',
    color: '#00CEC9',
    bgGradient: 'linear-gradient(135deg, #001a1a 0%, #002d2d 100%)',
    difficulty: '中等',
    description: '光固化（MSLA/DLP）打印件在打印中或后固化后发生翘曲变形，底面弯曲无法平放，精度受损。',
    causes: ['底层曝光时间过长产生收缩应力', '支撑不足受力不均', '后固化过久或照射不均匀', '树脂收缩率过高'],
    solutions: [
      { step: 1, title: '缩短底层曝光时间', detail: '底层曝光时间过长会引起强烈收缩应力。从推荐值开始，每次减少10–20%测试翘曲是否改善，找到粘附与应力的平衡点。' },
      { step: 2, title: '增加支撑数量', detail: '大面积悬空结构缺少支撑是翘曲的主要原因。在关键区域增加支撑点，尤其是远离打印平台的悬空边角处。' },
      { step: 3, title: '使用旋转台均匀后固化', detail: '后固化时使用旋转台确保各面均匀照射，避免单侧过度固化引起额外翘曲。从推荐时间下限开始，不要过度固化。' },
      { step: 4, title: '调整模型打印角度', detail: '将模型倾斜45°打印，可减少每层截面面积和剥离力，从根本上降低翘曲风险，同时改善表面质量。' }
    ],
    tips: '光固化树脂含有光敏单体，操作时请戴丁腈手套和护目镜，在通风处工作。清洗用95%酒精，固化后的树脂才可安全处理。'
  },
  {
    id: 'missing-thin-details',
    video: null,
    category: '切片',
    title: '细小特征打印缺失',
    subtitle: '薄壁和精细纹路被切片忽略',
    emoji: '🔬',
    color: '#6C5CE7',
    bgGradient: 'linear-gradient(135deg, #08001a 0%, #10002d 100%)',
    difficulty: '中等',
    description: '模型中的细小突起、薄壁结构或精细纹路在切片后消失，打印出的实物缺失这些设计细节。',
    causes: ['特征尺寸小于喷嘴直径', '建模壁厚不足', '切片过滤了细小特征', '切片精度设置过低'],
    solutions: [
      { step: 1, title: '更换更小直径喷嘴', detail: '0.4mm喷嘴无法打印0.4mm以下的特征。更换0.25mm或0.2mm喷嘴可打印更精细的细节，速度会降低但精度大幅提升。' },
      { step: 2, title: '在建模软件中加厚细节', detail: '壁厚应至少是喷嘴直径的1.5–2倍（0.4mm喷嘴对应最小0.6–0.8mm）。在建模时将细小特征加厚到可打印尺寸。' },
      { step: 3, title: '调整切片精度参数', detail: '在Cura中调小"Minimum Feature Size"阈值，或关闭该过滤选项，防止切片软件自动删除细小特征。' },
      { step: 4, title: '考虑光固化打印机', detail: '需要极高细节的模型（首饰、手办），光固化打印机精度可达0.05mm以下，远优于FDM，是精细细节的终极方案。' }
    ],
    tips: '切片后务必在预览模式中放大检查细节区域，确认打印路径正常生成。发现缺失时及早调整，比打印后发现缺陷节省大量时间。'
  },
  {
    id: 'slow-print-optimization',
    video: null,
    category: '切片',
    title: '打印时间过长',
    subtitle: '如何高效缩短打印时间',
    emoji: '⏱️',
    color: '#E17055',
    bgGradient: 'linear-gradient(135deg, #1a0800 0%, #2d1200 100%)',
    difficulty: '常见',
    description: '打印一个模型需要数小时甚至数天，通过合理调整切片设置，可以在几乎不损失质量的情况下大幅缩短打印时间。',
    causes: ['默认打印速度保守', '层高设置过小', '填充密度超出实际需要', '支撑策略低效'],
    solutions: [
      { step: 1, title: '增大层高', detail: '将层高从0.2mm增大到0.28mm（0.4mm喷嘴的75%上限），打印时间可缩短约25–30%，外观和强度几乎不受影响。' },
      { step: 2, title: '提高打印速度', detail: '大多数现代打印机可以安全运行在80–150mm/s。结合适当加速度（2000–3000mm/s²），实际打印时间可减少30–50%。' },
      { step: 3, title: '降低填充密度', detail: '展示模型填充密度5–10%即可，功能件20–30%通常已足够。将填充从默认20%降至10%可节省15–20%时间。' },
      { step: 4, title: '使用树形支撑', detail: '树形支撑（Tree Support）用料比标准格状支撑少50–80%，打印时间大幅缩短，且更易去除，推荐优先使用。' }
    ],
    tips: '支持Input Shaping共振补偿的打印机（Bambu Lab、Voron等）可在200–500mm/s下保持质量，是提速效果最明显的硬件升级方向。'
  },

  // ─── 新增问题 2 ───
  {
    id: 'extruder-clicking',
    video: null,
    category: '新手',
    title: '挤出机咔哒声 / 跳步',
    subtitle: '进料时发出规律性弹响',
    emoji: '🔧',
    color: '#FF6B6B',
    bgGradient: 'linear-gradient(135deg, #1a0a0a 0%, #2d0f0f 100%)',
    difficulty: '常见',
    description: '挤出机齿轮无法推动耗材时，步进电机丢步并发出"咔哒"弹响声，耗材被反复磨损，送料中断。',
    causes: ['喷嘴堵塞导致背压过高', '打印温度不足耗材太硬', '进料路径阻力过大', '挤出机张力弹簧过松'],
    solutions: [
      { step: 1, title: '提高打印温度', detail: '温度每提高5°C，耗材流动性增加，背压降低。先尝试提高10°C，观察咔哒声是否消失。' },
      { step: 2, title: '降低打印速度', detail: '速度过快时挤出机来不及推送耗材。将速度降低20–30%，给挤出机足够时间输送。' },
      { step: 3, title: '检查并清洁喷嘴', detail: '部分堵塞的喷嘴会造成背压升高。执行冷拔清洁（Atomic Pull）或更换新喷嘴。' },
      { step: 4, title: '调整挤出机张力', detail: '检查挤出机弹簧压力，太松齿轮无法咬紧耗材，太紧会磨损耗材。调至齿轮刚好能咬住耗材不打滑。' },
      { step: 5, title: '检查PTFE管路径', detail: '管道弯折或间隙会造成阻力增加。理顺管路，确保管子插入热端无间隙，弯曲角度不小于90°。' }
    ],
    tips: '挤出机持续咔哒通常是喷嘴堵塞的早期信号。处理越早越好，拖延会导致齿轮磨出沟槽，需要更换挤出机零件。'
  },
  {
    id: 'warped-bed',
    video: 'BV12M4y1u7vZ',
    category: '新手',
    title: '热床物理翘曲',
    subtitle: '热床表面不平整',
    emoji: '🏔️',
    color: '#74B9FF',
    bgGradient: 'linear-gradient(135deg, #000f1a 0%, #001a2d 100%)',
    difficulty: '需处理',
    description: '热床玻璃或金属板在高温下发生物理形变，中间凸起或四角翘起，导致调平后仍有区域第一层过高或过低。',
    causes: ['热床材质热胀冷缩', '安装螺丝力矩不均', '热床长期高温使用疲劳', '玻璃板本身质量缺陷'],
    solutions: [
      { step: 1, title: '使用自动调平（ABL）', detail: '安装BLTouch、CR Touch或压力传感器等自动调平探针，通过固件补偿热床不平，是最彻底的解决方案。' },
      { step: 2, title: '开启网格调平', detail: '在Marlin或Klipper固件中开启床网格补偿（Mesh Bed Leveling），探测多个点绘制床面地形图，打印时动态补偿Z高度。' },
      { step: 3, title: '更换PEI弹簧钢板', detail: 'PEI弹簧钢板比玻璃板更不易翘曲，且可拆卸弯曲取件，是目前最推荐的热床表面材料。' },
      { step: 4, title: '预热后再调平', detail: '热床完全加热到打印温度后再调平，而不是冷床调平。热膨胀会改变床面形态，冷床调平的参数在高温下会有偏差。' }
    ],
    tips: '轻微翘曲（<0.3mm）通过网格调平可以完全补偿，无需更换热床。严重翘曲（>0.5mm）建议直接换PEI钢板解决。'
  },
  {
    id: 'blobs-zits',
    video: null,
    category: '进阶',
    title: '表面疙瘩 / 料珠',
    subtitle: '外壁有小凸起和瑕疵',
    emoji: '🫧',
    color: '#A29BFE',
    bgGradient: 'linear-gradient(135deg, #0d001a 0%, #1a002d 100%)',
    difficulty: '中等',
    description: '打印件外壁出现随机分布的小突起（料珠）或小坑，在光滑表面上尤其明显，影响外观质量。',
    causes: ['回抽不足导致渗料', '接缝处溢料', '打印速度不均导致压力波动', '耗材受潮有气泡'],
    solutions: [
      { step: 1, title: '优化接缝位置', detail: '将接缝设置到模型最尖锐的角落，或选择"随机"模式，让料珠分散而不是集中在一处。' },
      { step: 2, title: '调整回抽参数', detail: '适当增大回抽距离（0.5mm步进）或回抽速度，减少喷嘴在移动过程中的渗料量。' },
      { step: 3, title: '开启Wipe擦拭', detail: '在接缝处开启Wipe（擦拭）功能，让喷嘴在封闭外壁后额外移动一小段，消耗多余压力中的耗材。' },
      { step: 4, title: '降低打印温度', detail: '温度过高耗材流动性强，更容易渗漏。每次降低5°C并打测试件观察。' },
      { step: 5, title: '检查耗材是否受潮', detail: '受潮耗材打印时有气泡爆裂，是造成随机料珠的重要原因之一。放入干燥箱烘干4小时后测试。' }
    ],
    tips: '料珠问题通常需要多参数联合调整，建议每次只改一个变量，打相同测试件对比，找到最优组合。'
  },
  {
    id: 'resin-fep-failure',
    video: null,
    category: '材料',
    printerType: 'SLA',
    title: '光固化 FEP 膜损坏',
    subtitle: '树脂漏入料槽下方',
    emoji: '⚠️',
    color: '#FDCB6E',
    bgGradient: 'linear-gradient(135deg, #1a1000 0%, #2d1f00 100%)',
    difficulty: '需处理',
    description: '光固化打印机的料槽底部FEP（或nFEP）透明膜出现划痕、穿孔或雾化，导致光线散射、打印失败，严重时树脂泄漏进入光源模块。',
    causes: ['打印件粘FEP时强行剥离', 'FEP膜张力不均造成局部应力', 'FEP使用过久自然老化', '支撑接触点反复拉扯'],
    solutions: [
      { step: 1, title: '检查FEP膜状态', detail: '清空料槽清洗后，对着光观察FEP是否有划痕、云雾状或小孔。任何明显损坏都应更换，不要带伤继续使用。' },
      { step: 2, title: '更换FEP膜', detail: '更换FEP膜是常规维护，通常每3–6个月或打印时间超过200小时后更换。更换时注意拉力均匀，安装后用手指轻弹发出清脆声为正确张力。' },
      { step: 3, title: '优化支撑设置减少剥离力', detail: '增大支撑接触直径（Contact Diameter）并减少支撑密度，让每次剥离的拉力分散，减少FEP单点受力。' },
      { step: 4, title: '添加抗离型涂层', detail: '在FEP上薄涂一层硅油（Ease Release 200）或专用离型剂，可大幅降低剥离力，延长FEP寿命。' }
    ],
    tips: 'nFEP膜寿命比普通FEP长2–3倍，价格略高但值得。ACF膜是目前最新技术，剥离力更小，适合精细模型打印。'
  },
  {
    id: 'inconsistent-extrusion',
    video: 'BV19u411d7Gh',
    category: '进阶',
    title: '挤出量不稳定',
    subtitle: '打印线条粗细不均匀',
    emoji: '〽️',
    color: '#FF7675',
    bgGradient: 'linear-gradient(135deg, #1a0500 0%, #2d0a00 100%)',
    difficulty: '进阶',
    description: '打印线条出现周期性或随机性粗细变化，导致层面不均匀、表面有明显纹路或出现局部过挤和欠挤交替出现的现象。',
    causes: ['耗材直径不均匀', '挤出机齿轮部分磨损', 'PTFE管内壁不平整', '送料路径阻力变化'],
    solutions: [
      { step: 1, title: '检测耗材直径', detail: '用游标卡尺测量耗材直径，每隔10cm测一次，共测10处。优质耗材直径公差应在±0.05mm内，超过±0.1mm会明显影响挤出均匀性。' },
      { step: 2, title: '更换挤出机齿轮', detail: '齿轮磨损后咬合力不均，导致送料时多时少。更换新的挤出齿轮（BMG、Orbiter等高质量挤出机效果更稳定）。' },
      { step: 3, title: '更换Capricorn PTFE管', detail: 'Capricorn管内径更精准（1.9mm vs 标准2mm），内壁更光滑，可显著改善送料均匀性，特别对小直径耗材效果明显。' },
      { step: 4, title: '校准Linear Advance', detail: '开启Klipper的Pressure Advance或Marlin的Linear Advance，动态补偿加减速时的压力变化，显著改善转角处的挤出均匀性。' }
    ],
    tips: '挤出量不稳定问题最容易在打印单色大面积模型时发现。打一个校准方块并用游标卡尺测量壁厚，能快速定位问题根源。'
  },

  // ─── 新手（续） ───
  {
    id: 'model-orientation',
    video: null,
    category: '新手',
    title: '模型摆放方向错误',
    subtitle: '朝向影响强度与质量',
    emoji: '🔄',
    color: '#00B894',
    bgGradient: 'linear-gradient(135deg, #001a13 0%, #002d1e 100%)',
    difficulty: '常见',
    description: '模型摆放方向直接影响打印强度、支撑用量和表面质量。错误的朝向可能导致模型易断裂、支撑难去除或表面粗糙。',
    causes: ['未考虑层间粘合方向与受力方向', '悬空面朝上导致支撑过多', '平放时底面面积太小易翘边', '关键细节贴近热床被压扁'],
    solutions: [
      { step: 1, title: '让最大平面朝下', detail: '将模型最大的平面贴近热床，增加附着面积，减少翘边风险，同时减少支撑用量。' },
      { step: 2, title: '受力方向垂直层间', detail: '3D打印件沿Z轴方向（垂直层）强度最弱。若模型需要承受弯曲力，应让受力方向与层面垂直，避免从层间断裂。' },
      { step: 3, title: '悬空面朝上而非朝下', detail: '悬空结构（悬挑）如果朝下需要支撑，朝上则不需要。旋转模型让悬挑角度小于45°可以无支撑打印。' },
      { step: 4, title: '利用切片软件自动优化', detail: 'Bambu Studio、PrusaSlicer的"自动朝向"功能可以自动分析并推荐最佳摆放方向，参考后再手动微调。' }
    ],
    tips: '圆柱形模型竖立打印更圆润，但横放更强；齿轮类模型平放表面更精细。多尝试几个角度比较支撑和表面质量再决定。'
  },
  {
    id: 'cooling-vs-adhesion',
    video: null,
    category: '新手',
    title: '冷却与粘合矛盾',
    subtitle: '风扇太强导致层间开裂',
    emoji: '❄️',
    color: '#74B9FF',
    bgGradient: 'linear-gradient(135deg, #00101a 0%, #001826 100%)',
    difficulty: '常见',
    description: '冷却风扇开太大会让每层打印后迅速冷却，导致层间粘合力不足、模型易沿层间断裂；风扇太小又会造成过热下垂。找到平衡点是关键。',
    causes: ['ABS/ASA等材料对风冷极其敏感', 'PLA风扇开太大导致层间开裂', '高速打印时冷却跟不上', '悬空部分需要强冷，实心部分不需要'],
    solutions: [
      { step: 1, title: 'ABS/ASA完全关闭风扇', detail: 'ABS和ASA打印时必须关闭冷却风扇，并配合封闭打印箱。风冷会直接导致层间开裂和翘边。' },
      { step: 2, title: 'PLA风扇从50%开始调', detail: 'PLA并非需要100%风扇，第1–3层建议0%，之后逐步升至50–80%。如果出现层间开裂，降低风扇速度。' },
      { step: 3, title: '使用变速冷却策略', detail: '在切片软件中设置实体层低风扇（30%）、悬挑和桥接层高风扇（100%），兼顾粘合和悬空质量。' },
      { step: 4, title: '提高温度补偿强冷', detail: '如果必须开大风扇，同步提高喷嘴温度5–10°C，保证层间有足够热量粘合。' }
    ],
    tips: 'PETG建议风扇不超过50%；PA（尼龙）建议不超过30%；PLA最宽容，50–100%均可，但遇到层间开裂优先降风扇。'
  },
  {
    id: 'layer-height-guide',
    video: null,
    category: '新手',
    title: '层高如何选择',
    subtitle: '层高与质量速度的关系',
    emoji: '📐',
    color: '#FDCB6E',
    bgGradient: 'linear-gradient(135deg, #1a1200 0%, #2d1e00 100%)',
    difficulty: '常见',
    description: '层高是影响打印质量和速度最直接的参数。层高太大质量粗糙，太小打印时间极长。理解层高与喷嘴直径的关系才能做出正确选择。',
    causes: ['层高超过喷嘴直径75%导致粘合不足', '层高过小打印时间翻倍但改善有限', '不同模型需求不同，没有万能设置', '喷嘴更换后未重新调整层高'],
    solutions: [
      { step: 1, title: '了解层高上限', detail: '层高不应超过喷嘴直径的75%。0.4mm喷嘴最大推荐层高为0.28mm，0.6mm喷嘴最大0.45mm。超过上限层间粘合会变差。' },
      { step: 2, title: '按用途选层高', detail: '展示模型追求外观：0.1–0.15mm。功能件追求速度：0.2–0.28mm（0.4mm喷嘴）。快速验证结构：0.28–0.32mm。粗打稿0.4mm以上。' },
      { step: 3, title: '使用自适应层高', detail: 'Cura、PrusaSlicer支持自适应层高，平面区域用大层高加速，曲面和细节区域自动切换小层高，兼顾速度和质量。' },
      { step: 4, title: '更换大喷嘴提速', detail: '换用0.6mm或0.8mm喷嘴配合更大层高，打印速度可提升数倍，适合打功能件和大模型原型。' }
    ],
    tips: '0.2mm层高是0.4mm喷嘴的"黄金层高"，质量和速度的最佳平衡点。大多数模型直接用这个不会错。'
  },
  {
    id: 'filament-storage',
    video: null,
    category: '新手',
    title: '耗材保存不当',
    subtitle: '受潮变质影响打印',
    emoji: '📦',
    color: '#A29BFE',
    bgGradient: 'linear-gradient(135deg, #0d0a1a 0%, #160f2d 100%)',
    difficulty: '常见',
    description: '耗材长期暴露在空气中会吸收水分，导致打印时出现气泡、噼啪声、表面粗糙、拉丝严重等问题。正确存储是保证打印质量的基础。',
    causes: ['耗材拆封后未密封存放', '环境湿度过高（>50%）', '存放时间过长', 'PVA/PA等吸湿性强的材料尤为严重'],
    solutions: [
      { step: 1, title: '使用密封袋或密封箱', detail: '每次打印后将耗材放入可密封的食品袋或塑料密封箱，加入足量硅胶干燥剂（每盘耗材约50克）。' },
      { step: 2, title: '投资耗材干燥箱', detail: '专用耗材干燥箱（PrintDry、eSUN eBOX等）可边烘干边打印。日常打印量大，这是最省心的选择。' },
      { step: 3, title: '受潮后烘干处理', detail: 'PLA：55°C 4小时；PETG：65°C 4小时；ABS：80°C 4小时；PA尼龙：85°C 6小时。用食品干燥机或低温烤箱。' },
      { step: 4, title: '判断是否受潮', detail: '打印时有气泡或爆裂声、表面有小疙瘩、颜色比正常暗沉、拉丝比平时更严重——这些都是受潮信号。' }
    ],
    tips: 'PA（尼龙）、PVA是最容易受潮的材料，开封后超过24小时不用就需要烘干。PLA和PETG在干燥地区可以放几周，但高湿度地区（南方）建议一周内用完或密封。'
  },

  // ─── 进阶（续） ───
  {
    id: 'estep-calibration',
    video: 'BV13y4y1Y7xw',
    category: '进阶',
    title: '挤出机E步校准',
    subtitle: '挤出量精确标定',
    emoji: '⚙️',
    color: '#6C5CE7',
    bgGradient: 'linear-gradient(135deg, #0a0815 0%, #120f22 100%)',
    difficulty: '进阶',
    description: 'E步（E-step）是挤出机每转1步对应的耗材送进长度。E步不准会导致系统性过挤或欠挤，是所有校准的基础步骤。',
    causes: ['出厂E步设置不适合实际挤出机', '更换挤出机后未重新校准', '齿轮磨损导致实际咬合直径变化', '不同耗材直径有偏差'],
    solutions: [
      { step: 1, title: '标记100mm参考点', detail: '从挤出机进料口量出100mm，用记号笔在耗材上做标记，再量出120mm处再做第二个标记（作为参照）。' },
      { step: 2, title: '指令挤出100mm', detail: '通过打印机菜单或G-code（G1 E100 F100）指令挤出100mm，注意打印机要处于加热状态。' },
      { step: 3, title: '测量实际挤出量', detail: '测量第一个标记到进料口的距离。若标记移动了95mm（实际挤出95mm），则E步需要乘以100/95=1.053进行修正。' },
      { step: 4, title: '写入E步值', detail: '计算新E步 = 当前E步 × (100 / 实际挤出量)。通过M92 E[新值]写入，再用M500保存。重复测试直到误差在±1mm内。' }
    ],
    tips: 'E步校准是基础，但Flow Rate（流量系数）才是打印中动态调整的手段。E步校准好后再通过打印测试件调整Flow Rate到95–105%范围内。'
  },
  {
    id: 'pressure-advance',
    video: 'BV1Mx421f76m',
    category: '进阶',
    title: '压力提前校准',
    subtitle: 'Pressure Advance / Linear Advance',
    emoji: '📈',
    color: '#00CEC9',
    bgGradient: 'linear-gradient(135deg, #001a1a 0%, #002d2d 100%)',
    difficulty: '进阶',
    description: '喷嘴在加速和减速时，耗材压力的变化会导致转角处过挤（鼓包）和直线段欠挤（凹陷）。压力提前校准可动态补偿这一问题，显著提升转角质量。',
    causes: ['加速时压力堆积导致转角鼓包', '减速时压力释放导致转角拉丝', '高速打印时问题更明显', 'Bowden机型因管道长度压力积累更大'],
    solutions: [
      { step: 1, title: 'Klipper 开启 Pressure Advance', detail: '在printer.cfg的[extruder]节添加 pressure_advance: 0.05（初始值）。打印官方PA测试塔，找到最佳值。' },
      { step: 2, title: 'Marlin 开启 Linear Advance', detail: '在Marlin固件中开启LIN_ADVANCE，重新编译烧录。打印测试塔（K-factor calibration），找到合适的K值（直驱0.1–0.5，Bowden 0.5–2.0）。' },
      { step: 3, title: '打印校准测试件', detail: '使用Marlin或Klipper官方校准脚本生成测试件，从低值到高值打印，找到转角最清晰、无鼓包且无凹陷的区段对应的值。' },
      { step: 4, title: '验证效果', detail: '校准后打印一个有直角转角的方块，检查转角是否清晰无鼓包，内角是否无欠挤凹陷。高速打印时效果最明显。' }
    ],
    tips: '直驱挤出机PA值通常在0.02–0.1之间；Bowden机型在0.3–1.5之间。每次更换耗材或调整速度都可能需要微调PA值。'
  },
  {
    id: 'pid-tuning',
    video: 'BV1Rv411p7fu',
    category: '进阶',
    title: 'PID温度调节',
    subtitle: '喷嘴温度波动大',
    emoji: '🌡️',
    color: '#E17055',
    bgGradient: 'linear-gradient(135deg, #1a0800 0%, #2d1000 100%)',
    difficulty: '进阶',
    description: 'PID（比例-积分-微分）控制器负责维持喷嘴和热床温度稳定。PID参数不准时温度会出现超调（过热后急速冷却反复震荡）或响应迟缓，影响打印质量。',
    causes: ['更换加热块或热敏电阻后原参数失效', '不同品牌热端热特性不同', '出厂参数未针对实际硬件优化', '环境温度变化大导致参数漂移'],
    solutions: [
      { step: 1, title: '运行PID自动整定', detail: '在打印机控制台发送：M303 E0 S200 C8（对喷嘴以200°C做8次测试）。等待完成后会输出Kp、Ki、Kd值。' },
      { step: 2, title: '保存PID参数', detail: '将自动整定输出的值写入：M301 P[Kp] I[Ki] D[Kd]，然后用M500保存到EEPROM。Klipper用户则写入pid_kp、pid_ki、pid_kd到printer.cfg。' },
      { step: 3, title: '热床PID整定', detail: '发送：M303 E-1 S60 C8（对热床以60°C做8次测试）。完成后用M304 P[Kp] I[Ki] D[Kd]写入并M500保存。' },
      { step: 4, title: '验证稳定性', detail: '整定后在打印机屏幕观察目标温度与实际温度的偏差，稳定后波动应在±1°C以内。超过±3°C需重新整定。' }
    ],
    tips: '每次更换热端组件（加热块、加热棒、热敏电阻）后都建议重新做PID整定。更换品牌不同的热端时尤其必要。'
  },
  {
    id: 'tolerance-calibration',
    video: null,
    category: '进阶',
    title: '尺寸精度校准',
    subtitle: '打印件尺寸偏差大',
    emoji: '📏',
    color: '#2D3436',
    bgGradient: 'linear-gradient(135deg, #0a0a0a 0%, #1a1a1a 100%)',
    difficulty: '进阶',
    description: '打印出来的零件比模型设计尺寸大或小，导致配合件装不进去或太松。尺寸精度问题通常来自挤出量、热膨胀或切片设置。',
    causes: ['Flow Rate（挤出量）偏高或偏低', '热膨胀导致冷却后收缩', '切片软件Line Width设置不准', '喷嘴磨损导致实际出料直径变化'],
    solutions: [
      { step: 1, title: '打印尺寸校准方块', detail: '打印20mm×20mm×20mm的校准方块，用游标卡尺测量X、Y、Z三个方向的实际尺寸，记录与20mm的偏差。' },
      { step: 2, title: '调整Flow Rate', detail: '若实测20.5mm（大0.5mm），将Flow Rate降低2–3%（如从100%降到97%）后重打。每次调整后重新测量，直到误差在±0.1mm内。' },
      { step: 3, title: '校准XY步进', detail: '若X和Y方向误差不同，说明步进值需要单独校准。计算：新步进 = 当前步进 × (目标尺寸 / 实测尺寸)，通过M92写入。' },
      { step: 4, title: '在切片中补偿孔径', detail: 'Cura的"Hole Horizontal Expansion"可以扩大孔的直径，用于螺丝孔等配合件的精确配合。正值让孔变大，建议从0.1mm开始尝试。' }
    ],
    tips: '不同材料收缩率不同：ABS收缩0.5–1%，PLA约0.2%，PETG约0.3%。做精密配合件时，先打一个小测试环件确认配合关系，避免浪费大件打印时间。'
  },
  {
    id: 'hollow-walls',
    video: null,
    category: '进阶',
    title: '外壁出现空洞缝隙',
    subtitle: '壁与填充之间有间隙',
    emoji: '🕳️',
    color: '#636E72',
    bgGradient: 'linear-gradient(135deg, #0d0d0d 0%, #1a1a1a 100%)',
    difficulty: '需处理',
    description: '模型外壁与填充之间出现明显缝隙，或外壁本身不连续，导致模型不密封、强度差，甚至打印完表面有孔洞。',
    causes: ['壁厚不是线宽的整数倍', '填充与外壁连接设置不足', 'Flow Rate偏低欠挤出', '打印速度外壁与填充差异过大'],
    solutions: [
      { step: 1, title: '检查壁厚设置', detail: '壁厚应设置为线宽的整数倍（如线宽0.4mm，壁厚设为0.8mm、1.2mm或1.6mm）。非整数倍会在壁与填充之间留下无法填补的间隙。' },
      { step: 2, title: '开启填充与外壁重叠', detail: '在切片软件中找到"Infill Overlap"或"Wall Overlap"，设置为10–15%。这让填充略微伸入外壁区域，消除缝隙。' },
      { step: 3, title: '检查Flow Rate', detail: '系统性欠挤出（Flow Rate偏低）会在所有位置出现细缝。打印测试方块测量壁厚，按比例调整Flow Rate。' },
      { step: 4, title: '确保外壁打印顺序正确', detail: '建议"外壁优先"（Outer Wall First）模式。外壁打完后填充贴着外壁，可以减少缝隙。' }
    ],
    tips: '薄壁模型（壁厚1mm左右）尤其容易出现这个问题。设计时建议壁厚为0.4mm的整数倍；如果是别人的模型，用Cura的"Thin Wall"选项尽量填充。'
  },

  // ─── 材料（续） ───
  {
    id: 'nylon-issues',
    video: 'BV1oK4y1m7mV',
    category: '材料',
    title: '尼龙（PA）打印难题',
    subtitle: '极易受潮、翘边严重',
    emoji: '🧵',
    color: '#FFEAA7',
    bgGradient: 'linear-gradient(135deg, #1a1500 0%, #2d2200 100%)',
    difficulty: '进阶',
    description: '尼龙是强度、韧性最好的FDM耗材之一，但极易吸湿，打印要求高：必须干燥、高温、封闭环境，否则质量极差。',
    causes: ['尼龙吸湿速度极快（开封2小时即可受潮）', '打印温度低于240°C粘合不足', '未封闭环境翘边严重', 'PTFE管在260°C以上会降解释放有毒气体'],
    solutions: [
      { step: 1, title: '彻底烘干再打印', detail: '尼龙打印前必须烘干：80–85°C 烘干6–8小时。打印过程中也建议持续加热烘干（50°C）。受潮尼龙打印出来强度极差且气泡多。' },
      { step: 2, title: '使用全金属热端', detail: '尼龙打印温度240–270°C，超过260°C时PTFE管（聚四氟乙烯）会降解产生有害气体。推荐使用全金属热端（如Slice Engineering的Copperhead）。' },
      { step: 3, title: '封闭打印箱+高热床', detail: '尼龙翘边比ABS更严重，需要全封闭打印箱（箱内温度保持45°C以上）。热床温度建议70–90°C，PEI热床效果最佳。' },
      { step: 4, title: '使用PA-CF或PA-GF改善翘边', detail: '碳纤维增强尼龙（PA-CF）和玻璃纤维增强尼龙（PA-GF）翘边比纯PA小得多，同时强度更高，是实用零件的首选。' }
    ],
    tips: '尼龙和PEI磁力钢板粘合极好，甚至可能太好（撕不下来）。可在热床上涂一薄层胶棒作为脱模剂，冷却后轻松取下。'
  },
  {
    id: 'cf-filament',
    video: 'BV1qK4y1v7Af',
    category: '材料',
    title: '碳纤维耗材使用',
    subtitle: '磨损喷嘴、强度极高',
    emoji: '🏎️',
    color: '#2D3436',
    bgGradient: 'linear-gradient(135deg, #050505 0%, #111111 100%)',
    difficulty: '进阶',
    description: '碳纤维复合耗材（CF-PLA、CF-PETG、CF-PA等）强度高、重量轻，但碳纤维颗粒会快速磨损普通黄铜喷嘴，必须搭配硬化钢或红宝石喷嘴。',
    causes: ['碳纤维颗粒硬度远高于黄铜', '普通喷嘴数小时内磨损严重', '表面比纯料粗糙，层间有时粘合不足', '打印温度需比对应基础料高10–20°C'],
    solutions: [
      { step: 1, title: '更换硬化钢喷嘴', detail: '碳纤维/玻纤/金属粒子耗材必须使用硬化钢喷嘴（Hardened Steel）、钛合金喷嘴或红宝石喷嘴。黄铜喷嘴会在几十小时内报废。' },
      { step: 2, title: '适当提高温度', detail: 'CF耗材通常需要比对应基础料高10–20°C。CF-PLA建议220–240°C；CF-PETG 240–260°C；CF-PA 260–280°C。温度不足层间粘合差。' },
      { step: 3, title: '降低速度', detail: 'CF耗材脆性较大，高速打印容易在弯曲处断料。建议打印速度不超过40mm/s，回抽距离减小（直驱0.5mm以下）。' },
      { step: 4, title: '接受粗糙表面', detail: 'CF耗材表面固有粗糙度高于纯料，这是材料特性，不是缺陷。若需光滑表面，考虑使用表层纯料+内部CF料的多色打印策略。' }
    ],
    tips: 'CF耗材层间强度比连续碳纤维差很多，强度主要来自XY平面内的纤维取向。设计时让受力方向平行于打印平面，可以充分发挥CF耗材的强度优势。'
  },
  {
    id: 'asa-printing',
    video: 'BV1oM4y1a74q',
    category: '材料',
    title: 'ASA户外耗材打印',
    subtitle: '耐候性强但比ABS更难打',
    emoji: '☀️',
    color: '#FDCB6E',
    bgGradient: 'linear-gradient(135deg, #1a1000 0%, #2d1c00 100%)',
    difficulty: '进阶',
    description: 'ASA（丙烯腈苯乙烯丙烯酸酯）是ABS的升级版，抗紫外线能力强5倍以上，适合户外零件。但打印难度比ABS更高，对封闭环境要求更严格。',
    causes: ['比ABS更大的热膨胀系数导致翘边', '有刺鼻气味（在封闭空间打印需通风）', '与热床粘合比ABS更难', '对温度均匀性要求高'],
    solutions: [
      { step: 1, title: '全封闭打印箱+高温', detail: '封闭打印箱内温度建议维持在50°C以上。喷嘴温度240–260°C，热床温度95–110°C。比ABS温度要求更高。' },
      { step: 2, title: '使用PEI+胶棒', detail: 'ASA与PEI磁力钢板的粘合一般，建议涂一薄层胶棒（紫色固体胶）。冷却到40°C以下，胶棒收缩让模型自然松脱。' },
      { step: 3, title: '使用强力Brim', detail: 'Brim宽度建议15–20mm（比ABS更宽），配合鼠耳（Mouse Ear）在四角额外加垫，防止角落翘起。' },
      { step: 4, title: '注意通风', detail: 'ASA气味比ABS更强，含有有害挥发物。封闭箱打印时开启排风过滤，或在通风良好的房间打印，打印期间避免长时间在旁边停留。' }
    ],
    tips: 'ASA特别适合：车内零件、户外路标、花盆、灯具外壳等需要长期日晒的场景。如果只是室内使用，PETG或ABS更好打且效果相近。'
  },
  {
    id: 'resin-exposure',
    video: 'BV1Zd4y117EM',
    category: '材料',
    printerType: 'SLA',
    title: '光固化曝光参数调校',
    subtitle: '欠曝过曝影响精度和强度',
    emoji: '💡',
    color: '#6C5CE7',
    bgGradient: 'linear-gradient(135deg, #0a0818 0%, #100c28 100%)',
    difficulty: '进阶',
    description: '光固化打印中，曝光时间过短（欠曝）导致层间粘合差、模型脆；曝光时间过长（过曝）导致细节丢失、孔洞缩小。不同树脂和光源强度需要单独校准。',
    causes: ['换用新品牌/新颜色树脂后参数不匹配', '灯源老化后光强下降', '温度低时树脂固化速度变慢', '底层过曝导致FEP粘连'],
    solutions: [
      { step: 1, title: '打印曝光校准矩阵', detail: '使用RERF（Resin Exposure Range Finder）或AmeraLabs AMD测试文件，一次打印出不同曝光时间的对比，找出最佳值。' },
      { step: 2, title: '调整底层曝光时间', detail: '底层曝光过长会让模型粘在FEP上（剥离失败）。标准底层曝光建议是正常层曝光的5–10倍。如出现剥离失败，先减少底层曝光。' },
      { step: 3, title: '温度低时适当延长曝光', detail: '树脂在低温（<20°C）时流动性差、固化慢，需要延长曝光时间10–20%。可以用热风枪适当加热树脂槽（不超过35°C）。' },
      { step: 4, title: '更换树脂后重新校准', detail: '不同树脂、不同颜色（尤其是黑色、白色等不透明颜色）对光的吸收率不同，必须单独校准。不要直接套用其他树脂的参数。' }
    ],
    tips: '在树脂瓶上贴标签记录曝光参数，以后用同款树脂直接参照，省去每次重新校准的麻烦。'
  },
  {
    id: 'resin-support-marks',
    video: 'BV1Se4y1n7uH',
    category: '材料',
    printerType: 'SLA',
    title: '光固化支撑痕迹明显',
    subtitle: '去支撑后表面有坑',
    emoji: '🔩',
    color: '#00B894',
    bgGradient: 'linear-gradient(135deg, #001a12 0%, #002d1e 100%)',
    difficulty: '需处理',
    description: '去除支撑后，接触点留下明显的白点、凹坑或撕裂痕迹，影响模型外观。支撑参数设置是核心，后处理也很重要。',
    causes: ['支撑接触直径太大（Contact Diameter）', '支撑密度太高、连接太实', '去除支撑时强行撕扯', '支撑生成在外观重要的表面'],
    solutions: [
      { step: 1, title: '减小支撑接触直径', detail: '将支撑顶部接触直径从默认的0.6mm减小到0.3–0.4mm，接触面积更小，去除后留下的坑更浅。接触层数也可减少到1–2层。' },
      { step: 2, title: '优化支撑放置位置', detail: '手动放置支撑，尽量让支撑落在不重要的内侧表面，避免支撑接触模型的正面和可见区域。' },
      { step: 3, title: '二次固化前去支撑', detail: '在二次UV固化之前去除支撑，此时树脂还有一定弹性，支撑接触点更容易干净分离，痕迹更浅。' },
      { step: 4, title: '砂纸打磨修复', detail: '去支撑后用400目砂纸轻磨痕迹，再用800–1200目细砂纸抛光，涂一层补土（Primer）可以填平轻微坑点。' }
    ],
    tips: '使用水洗树脂（Water Washable Resin）配合酒精基支撑，比标准支撑更容易去除，痕迹更少。对外观要求极高的手办、首饰模型尤为推荐。'
  },

  // ─── 切片（续） ───
  {
    id: 'support-optimization',
    video: 'BV1X44y1e7WD',
    category: '切片',
    title: '支撑策略优化',
    subtitle: '减少支撑同时保证质量',
    emoji: '🏗️',
    color: '#FF7675',
    bgGradient: 'linear-gradient(135deg, #1a0500 0%, #2d0a00 100%)',
    difficulty: '需处理',
    description: '默认支撑设置往往过于保守，导致耗材和时间浪费，还难以去除。通过合理设置可以大幅减少支撑用量，同时不影响打印质量。',
    causes: ['默认支撑角度太保守（生成过多）', '支撑密度设置太高（难以去除）', '没有利用树形支撑的优势', '模型朝向未优化导致需要大量支撑'],
    solutions: [
      { step: 1, title: '调整悬挑角度阈值', detail: '大多数切片软件默认在45°以上角度生成支撑。实际上50–55°悬挑通常可以无支撑打印。可以先打测试件（悬挑测试塔）确认自己打印机的极限角度。' },
      { step: 2, title: '使用树形支撑（Tree Support）', detail: '树形支撑接触点少、用料少，且去除更容易。PrusaSlicer和Bambu Studio的树形支撑效果极佳，推荐默认使用。Cura的树形支撑也在持续改进中。' },
      { step: 3, title: '手动删除不必要的支撑', detail: '自动生成后，在切片软件中用"支撑画笔"手动删除内腔支撑（打完也看不到的地方）、无关紧要的小悬挑。' },
      { step: 4, title: '支撑界面层降低密度', detail: '支撑主体密度设低（5–8%），只保留顶部界面层（3–5层）密度高（50%），兼顾支撑质量和易去除性，比统一高密度用料少50%。' }
    ],
    tips: '先在切片软件中预览支撑在哪里，然后转一下模型方向——通常旋转15–30°就能消除大部分支撑需求，比调参数更有效。'
  },
  {
    id: 'infill-settings',
    video: null,
    category: '切片',
    title: '填充强度与图案选择',
    subtitle: '不同场景填充设置指南',
    emoji: '🔲',
    color: '#00B894',
    bgGradient: 'linear-gradient(135deg, #001a10 0%, #002d1a 100%)',
    difficulty: '常见',
    description: '填充率和图案直接影响模型强度、用料和打印时间。15%填充可能足以应付摆件，承重件可能需要40%以上，图案选择也至关重要。',
    causes: ['填充率不够导致模型脆弱', '填充图案选择不当降低效率', '顶面打印质量差与填充密度有关', '大面积模型用高填充率浪费时间和耗材'],
    solutions: [
      { step: 1, title: '按用途选填充率', detail: '纯展示摆件：5–15%；日常功能件：15–25%；受力零件：30–50%；极高强度需求：50–80%（超过80%性价比很低，通常不推荐）。' },
      { step: 2, title: '选对填充图案', detail: '闪电形（Lightning）最省料，仅支撑顶面；陀螺形（Gyroid）各向同性强度最均匀；蜂巢（Honeycomb）适合中等强度；直线（Lines/Grid）打印速度最快。' },
      { step: 3, title: '调整顶面实体层数', detail: '若顶面出现空洞，不一定要增加填充率——增加顶层层数（Top Layers）从默认3层改到4–5层，效果更好且省时省料。' },
      { step: 4, title: '局部加强特定区域', detail: 'Cura的"填充修改器"可以对某个区域单独设置高填充率，而其他部分保持低填充率，实现精准强化。适合螺丝孔周围、铰链等受力点。' }
    ],
    tips: '3壁+20%填充+陀螺图案是平衡强度、速度和用料的"万能组合"。如果不确定用什么，从这个开始。'
  },
  {
    id: 'ironing-setting',
    video: 'BV1oL411c7U1',
    category: '切片',
    title: '熨烫功能（Ironing）设置',
    subtitle: '顶面过于粗糙的解决方案',
    emoji: '🔥',
    color: '#E17055',
    bgGradient: 'linear-gradient(135deg, #1a0800 0%, #2d1000 100%)',
    difficulty: '进阶',
    description: '熨烫（Ironing）功能让喷嘴在打印完顶面后以极慢速度、极小流量再扫一遍，将表面熔平，显著改善顶面光洁度，是展示模型的利器。',
    causes: ['顶面填充线条可见，表面有纹路', '打印速度快导致顶面来不及平整', '默认设置未开启熨烫功能', '熨烫速度或流量设置不当效果差'],
    solutions: [
      { step: 1, title: '开启熨烫功能', detail: '在Cura中搜索"Ironing"，开启后默认只对最顶层应用。PrusaSlicer中叫"Ironing"或"顶面熨烫"，Bambu Studio也有相同功能。' },
      { step: 2, title: '调整熨烫速度', detail: '熨烫速度建议为正常打印速度的40–60%（约20–40mm/s）。速度太快效果差，太慢可能过热导致上层变形。' },
      { step: 3, title: '调整熨烫流量', detail: '熨烫时流量应减少，默认10–15%。流量太高会在表面堆积耗材，流量太低熨烫效果不明显。根据效果微调。' },
      { step: 4, title: '只对需要的面应用', detail: '熨烫会增加打印时间，推荐只对"最顶层"或特定角度的面应用，而不是所有水平面。根据模型情况调整"Ironing Pattern"。' }
    ],
    tips: 'PLA和PETG熨烫效果最好。ABS因为收缩可能出现波纹，TPU太软效果有限。开启熨烫后建议同步开启"Outer Wall Wipe"减少起始点的疙瘩。'
  },
  {
    id: 'split-large-model',
    video: null,
    category: '切片',
    title: '大模型分割打印',
    subtitle: '超过打印尺寸的模型处理',
    emoji: '✂️',
    color: '#74B9FF',
    bgGradient: 'linear-gradient(135deg, #00101a 0%, #001626 100%)',
    difficulty: '需处理',
    description: '模型尺寸超出打印机范围，或者某个朝向下支撑过多，可以将模型切割为多个部分分别打印，再通过榫接、螺丝或粘合剂拼合。',
    causes: ['模型尺寸超过打印机最大体积', '垂直方向打印导致需要大量支撑', '大模型翘边风险高', '某些部分需要不同填充率或方向'],
    solutions: [
      { step: 1, title: '使用切片软件内置切割', detail: 'PrusaSlicer的"切割"工具可以沿任意平面切割模型，并自动生成榫头（Connector）供拼合定位。Meshmixer的"平面切割"也很好用。' },
      { step: 2, title: '设计拼合方式', detail: '常见拼合方式：燕尾榫（防止平移）、圆柱榫（定位）、螺纹孔（用螺丝连接）、磁铁孔（隐藏磁铁）。设计时为接合处预留0.2mm间隙方便安装。' },
      { step: 3, title: '选择合适粘合剂', detail: 'PLA/PETG：氰基丙烯酸酯（强力胶）效果极佳，5分钟固化；ABS：用纯丙酮溶解少量ABS制作"ABS浆"作为强力粘合剂；TPU：只能用专用弹性胶或超强双面胶。' },
      { step: 4, title: '按方向分割优化朝向', detail: '将模型按功能区域或受力方向切割，让每个部分都以最佳朝向打印。例如：柱形部分竖直打（圆度好），板状部分平打（强度高）。' }
    ],
    tips: '接合面越大越牢固。切割时尽量让接合面位于模型内部隐藏区域，既美观又可以做大接合面。表面粗糙（不抛光）的接合面比光滑面粘合更牢固。'
  },
  {
    id: 'variable-layer-height',
    video: null,
    category: '切片',
    title: '自适应层高使用',
    subtitle: '速度与细节两全其美',
    emoji: '📊',
    color: '#A29BFE',
    bgGradient: 'linear-gradient(135deg, #0d0a1a 0%, #160f2d 100%)',
    difficulty: '进阶',
    description: '自适应层高（Adaptive Layer Height）根据模型形状自动调整每层的层高：平面区域用大层高加速，曲面和细节区域自动切换小层高，兼顾速度和质量。',
    causes: ['固定层高在平面区域浪费时间', '固定层高在曲面处阶梯感明显', '手动调整层高费时费力', '不同区域对层高要求不同'],
    solutions: [
      { step: 1, title: 'PrusaSlicer开启自适应层高', detail: '导入模型后，右键点击对象→"自适应层高"，设置最小层高（如0.05mm）和最大层高（如0.3mm）。软件会自动分析模型曲率调整。' },
      { step: 2, title: '设置质量阈值', detail: '"质量"参数控制层高过渡的灵敏度，建议0.12–0.2。数值越小，层高变化越细腻，打印时间也越长。先用默认值打一次观察效果。' },
      { step: 3, title: '手动覆盖关键区域', detail: '在PrusaSlicer的层高编辑器中，可以手动为特定高度区间强制设置层高，适合在螺纹、凸台等关键尺寸区域强制使用小层高。' },
      { step: 4, title: 'Cura使用层高Modifier', detail: 'Cura没有原生自适应层高，但可以用"每层高度渐变"插件，或者手动在不同高度区段设置不同层高Profile来实现类似效果。' }
    ],
    tips: '自适应层高对球体、圆弧、斜面模型效果最显著，能减少20–40%打印时间同时保持相同视觉质量。对方形、纯平面模型几乎没有改善。'
  },

  // ─── 维护 ───
  {
    id: 'hotend-maintenance',
    video: null,
    category: '维护',
    title: '热端日常维护',
    subtitle: '保持出丝稳定的基础',
    emoji: '🔧',
    color: '#E17055',
    bgGradient: 'linear-gradient(135deg, #1a0800 0%, #2d1000 100%)',
    difficulty: '需处理',
    description: '热端是打印机最关键的消耗部件。定期维护喷嘴、加热块、散热片和PTFE管，可以有效预防堵塞、漏料、挤出不稳等问题。',
    causes: ['喷嘴长期使用磨损和积碳', 'PTFE管老化产生间隙', '加热块外壁积累耗材碳化', '散热片灰尘堵塞影响散热'],
    solutions: [
      { step: 1, title: '定期清洁喷嘴外壁', detail: '加热到打印温度，用硅酮袜子（Silicone Sock）保护加热块。没有袜子时，用铜刷在高温状态下轻刷喷嘴外壁积碳，不要用硬金属工具划伤。' },
      { step: 2, title: '定期更换PTFE管', detail: 'PTFE管建议每200–500打印小时更换一次，或发现进料阻力增大时更换。剪断端口要用专用切割器，确保切面垂直，否则会有间隙导致堵塞。' },
      { step: 3, title: '检查热端螺丝是否松动', detail: '喷嘴在热胀冷缩中可能松动，导致漏料。建议每月在打印温度下用扳手轻微紧固喷嘴（顺时针，不要过紧），注意避免烫伤。' },
      { step: 4, title: '定期清洁散热片', detail: '用气枪吹走散热片间的灰尘和耗材碎屑，保证散热效果。散热不良是热爬升的主要原因之一。每月检查一次。' }
    ],
    tips: '建议在打印日志中记录打印小时数，到200小时时做一次全面热端检查。更换喷嘴时建议在打印温度下操作，冷态强行拧可能滑丝。'
  },
  {
    id: 'linear-rail-maintenance',
    video: null,
    category: '维护',
    title: '导轨与丝杆润滑',
    subtitle: '减少噪音延长机器寿命',
    emoji: '🛠️',
    color: '#636E72',
    bgGradient: 'linear-gradient(135deg, #0d0d0d 0%, #1c1c1c 100%)',
    difficulty: '需处理',
    description: '光轴、丝杆、线性导轨（Linear Rail）需要定期润滑，干摩擦会产生噪音、加速磨损，甚至导致打印机Z轴波动和层移。',
    causes: ['润滑剂挥发或被耗材粉末污染', '新机出厂润滑不足', '长期使用后润滑剂老化变质', '线性导轨中混入灰尘和耗材碎屑'],
    solutions: [
      { step: 1, title: '光轴用白锂脂', detail: '用无绒布将光轴上的旧润滑脂和灰尘擦净，然后薄涂一层白锂脂（White Lithium Grease），手动来回移动打印头几次让润滑剂均匀分布。' },
      { step: 2, title: '丝杆用丝杆专用油', detail: '用棉签将丝杆清洁后，涂抹超级润滑脂（如Super Lube）或PTFE干性润滑剂。从顶到底均匀涂抹，不要用缝纫机油（太稀、容易甩出污染打印件）。' },
      { step: 3, title: '线性导轨用精密润滑脂', detail: '线性导轨（MGN12等）需要用精密导轨润滑脂（Mobil EP0或类似产品）。通过注油孔注入，如无注油孔则在滑块两侧涂抹后来回运动。' },
      { step: 4, title: '润滑频率建议', detail: '普通光轴和丝杆：每3个月或约500打印小时润滑一次；线性导轨：每6个月一次。发现噪音增大或运动阻力增加时应立即润滑，不要等到规定时间。' }
    ],
    tips: '新机器到手后先检查出厂润滑是否充分，许多低价机器出厂几乎没有润滑。加润滑脂后打印几层，会发现打印噪音和振纹明显减少。'
  },
  {
    id: 'power-loss-recovery',
    video: null,
    category: '维护',
    title: '断电续打设置',
    subtitle: '避免大模型因断电报废',
    emoji: '⚡',
    color: '#FDCB6E',
    bgGradient: 'linear-gradient(135deg, #1a1200 0%, #2d1e00 100%)',
    difficulty: '需处理',
    description: '打印大型模型时，突然断电会导致整个模型报废。断电续打（Power Loss Recovery，PLR）功能可以在断电后从上次打印位置继续，减少损失。',
    causes: ['打印机未开启断电续打功能', '断电后喷嘴冷缩导致续打缝隙明显', '固件版本不支持PLR功能', '拔电源和正常关机的区别未处理好'],
    solutions: [
      { step: 1, title: '确认固件支持PLR', detail: '在打印机菜单中查找"断电续打"或"Power Loss Recovery"选项并开启。大多数Marlin固件2.0+版本支持，Klipper通过SAVE_GCODE_STATE实现。' },
      { step: 2, title: '开启后测试', detail: '打印一个测试件，打印到一半时手动关闭打印机电源（不是屏幕关机），重新开机选择"继续打印"，检查接缝是否明显。' },
      { step: 3, title: '优化接缝处理', detail: '续打接缝不可避免会有轻微痕迹。在切片软件中，将"接缝位置"设为隐藏处（背面或角落），让续打接缝也落在同一区域，减少视觉影响。' },
      { step: 4, title: '使用UPS不间断电源', detail: '对于超长时间打印（>24小时），建议为打印机配备UPS（不间断电源），停电时有10–30分钟继续打印和安全关机的时间，比断电续打更可靠。' }
    ],
    tips: '断电续打在硬件突然断电时有效，但"软件崩溃"（打印机屏幕死机）PLR无能为力。Klipper用户可以开启"Virtual SD Card"定期保存进度，应对更多故障场景。'
  },
  {
    id: 'firmware-update',
    video: null,
    category: '维护',
    title: '固件更新指南',
    subtitle: '升级新功能与修复问题',
    emoji: '💾',
    color: '#0984E3',
    bgGradient: 'linear-gradient(135deg, #000d1a 0%, #001526 100%)',
    difficulty: '进阶',
    description: '固件更新可以修复BUG、添加新功能（如自动调平、压力提前）、改善温度控制。但操作不当可能导致机器暂时无法使用，需要按步骤谨慎进行。',
    causes: ['出厂固件版本较旧缺少功能', '当前固件有已知BUG', '更换主板后需要重新刷固件', '启用Klipper代替Marlin'],
    solutions: [
      { step: 1, title: '确认当前固件版本', detail: '在打印机设置→"About"或"关于"中查看当前固件版本。对应品牌官网查找最新版本，确认是否有必要更新（不强求追最新版）。' },
      { step: 2, title: '下载官方固件', detail: '务必从官方网站或GitHub仓库下载对应型号的固件，不要使用来历不明的第三方固件。确认文件是针对你的主板型号（Creality有多种主板）。' },
      { step: 3, title: 'SD卡刷写方法', detail: '将固件文件（通常是.bin文件）复制到FAT32格式的SD卡根目录，插入打印机重新开机，打印机会自动识别并刷写。刷写完成后屏幕恢复正常显示。' },
      { step: 4, title: '刷写后重置配置', detail: '更新固件后建议发送M502（恢复出厂配置）再重新配置步进、PID等参数，避免旧参数与新固件不兼容导致异常。记得备份原有配置。' }
    ],
    tips: '非必要不要轻易更新固件——"用得好好的不要动"是电子设备的金规则。只有明确遇到固件BUG、需要新功能或更换硬件时再更新，更新前备份当前版本。'
  },
  {
    id: 'bed-replacement',
    video: null,
    category: '维护',
    title: '热床更换与升级',
    subtitle: 'PEI磁力钢板换装指南',
    emoji: '🟫',
    color: '#B2BEC3',
    bgGradient: 'linear-gradient(135deg, #111111 0%, #222222 100%)',
    difficulty: '需处理',
    description: '原厂玻璃床或BuildTak热床用久了粘合力下降，换装PEI磁力弹簧钢板是目前最受欢迎的升级方案，粘合力强、易取件、耐用。',
    causes: ['原厂热床表面粘合力下降', '玻璃床破裂或翘曲', '想要更方便的取件方式', 'PEI表面比BuildTak对更多材料兼容'],
    solutions: [
      { step: 1, title: '测量热床尺寸选产品', detail: '量取热床长宽（常见235×235mm、220×220mm、310×310mm），购买对应尺寸的PEI磁力钢板套装（含底部磁贴和上面的弹性钢板）。' },
      { step: 2, title: '安装磁性底贴', detail: '清洁热床表面（酒精擦净），撕掉磁贴背胶，从一端开始贴，用刮板排除气泡。确保磁贴完全平整，有气泡会导致PEI钢板不平。' },
      { step: 3, title: '重新调平', detail: '换了新热床面后必须重新调平（热床材料厚度变化）。如有ABL传感器，也需重新探测热床并保存网格数据。' },
      { step: 4, title: '日常使用要点', detail: '每次打印前用异丙醇擦拭PEI表面（去除手油）；高温取件可能粘住，冷却后轻弯钢板模型自然脱落；PEI表面每半年用细砂纸（2000目）轻磨复原粘合力。' }
    ],
    tips: '光滑面PEI粘合力强适合PLA/ABS，磨砂面PEI对PETG等粘合力更温和更易脱。购买时选双面（一面光滑一面磨砂）的产品，可以两面翻转使用。'
  },
  {
    id: 'motor-stall',
    video: null,
    category: '维护',
    title: '步进电机失步处理',
    subtitle: '电机不转或异常抖动',
    emoji: '⚡',
    color: '#FF7675',
    bgGradient: 'linear-gradient(135deg, #1a0500 0%, #2d0a00 100%)',
    difficulty: '需处理',
    description: '步进电机失步（丢步）会导致层移位、打印错位或电机异常抖动发热。轻微失步可通过参数调整解决，严重时需要检查硬件。',
    causes: ['打印速度或加速度超出电机能力', '驱动电流设置不足', '皮带太松或齿轮打滑', '导轨阻力太大'],
    solutions: [
      { step: 1, title: '降低速度和加速度', detail: '将打印速度降低20–30%，加速度从3000mm/s²降到1000–2000mm/s²。大多数失步问题可以通过降速解决，这是最快的方法。' },
      { step: 2, title: '检查并调整驱动电流', detail: '步进驱动器电流不足时电机力矩不够容易失步。通过固件(M906)或驱动板上的电位器适当增加电流，但不要超过电机额定电流的80%，过高会过热损坏。' },
      { step: 3, title: '检查机械阻力', detail: '手动推动打印头和热床，感受是否有异常阻力点。润滑光轴和丝杆，检查皮带张力（过松或过紧都会导致问题），紧固所有螺丝。' },
      { step: 4, title: '启用电机堵转检测', detail: 'Klipper支持TMC驱动的堵转检测（Stall Guard），可在电机失步时自动停止打印并报警，防止打印更多废品。需要TMC2209或类似驱动器。' }
    ],
    tips: '步进电机正常工作时微微热（手触可耐受），过烫（无法触摸）说明驱动电流过大；冷的（室温）说明电流可能不足。正确温度在40–60°C之间。'
  },

  // ─── 新增：热门话题 ───
  {
    id: 'ams-jam',
    video: 'BV1qG411n7GS',
    category: '进阶',
    printerType: 'FDM',
    title: 'AMS多色自动换料卡料',
    subtitle: '拓竹 AMS 进退料失败',
    emoji: '🎰',
    color: '#00B894',
    bgGradient: 'linear-gradient(135deg, #001a12 0%, #002d1f 100%)',
    difficulty: '常见',
    description: '拓竹（Bambu Lab）AMS（自动耗材系统）在换料时卡料、回抽失败或耗材检测异常，是多色打印最常见的故障之一。',
    causes: ['耗材末端不平整或有毛刺', 'PTFE管磨损有碎屑', '耗材受潮膨胀变形', 'AMS齿轮夹力不足', '耗材缠绕打结'],
    solutions: [
      { step: 1, title: '处理耗材末端', detail: '用耗材剪将耗材末端斜剪成45°尖头，去除毛刺和弯折。Bambu Lab官方建议剪成尖头以顺利穿过AMS。' },
      { step: 2, title: '清洁PTFE管和齿轮', detail: '取出PTFE管，用细棉签蘸酒精清洁管内壁碎屑。打开AMS盖板检查齿轮，用软刷清除粉末。PTFE管磨损后需更换（约6个月或500小时一换）。' },
      { step: 3, title: '烘干耗材', detail: 'AMS对耗材吸潮非常敏感。PLA超过5%湿度就会膨胀，导致在AMS管道中卡住。将耗材放入Bambu干燥箱或食品干燥箱50°C烘干4小时后再用。' },
      { step: 4, title: '调整AMS齿轮夹紧力', detail: 'AMS轮毂背面有夹紧力调节旋钮，若耗材频繁打滑，顺时针拧紧0.5圈。不同耗材直径误差也影响夹紧效果，换到误差小的品牌耗材。' },
      { step: 5, title: '手动辅助清仓', detail: '卡料时在打印机屏幕→AMS→回抽，同时用手轻推耗材配合。若完全卡死，拔出进料管，用针穿过耗材检测孔向内推出。' }
    ],
    tips: 'AMS换料时打印机会自动清料，这属于正常消耗，不是故障。如果换料塔废料过多，可在Bambu Studio里降低换料清洁次数。'
  },
  {
    id: 'pei-maintenance',
    video: 'BV1WT421m7Au',
    category: '维护',
    printerType: 'FDM',
    title: 'PEI磁吸钢板保养',
    subtitle: '钢板附着力下降或粘太死',
    emoji: '🧲',
    color: '#6C5CE7',
    bgGradient: 'linear-gradient(135deg, #0a001a 0%, #13002d 100%)',
    difficulty: '常见',
    description: 'PEI弹簧钢板热时粘、冷时自动脱落，是目前最受欢迎的热床表面之一。但使用不当会导致附着力快速下降或损坏。',
    causes: ['手油污染PEI表面', '高温材料（ABS/ASA）将PEI拉伤', '清洁不当使用了不兼容溶剂', 'PEI表面达到使用寿命'],
    solutions: [
      { step: 1, title: '日常清洁：异丙醇擦拭', detail: '每打印3–5次用90%以上异丙醇（IPA）擦拭钢板表面，去除手油和残留耗材。不要用丙酮（会腐蚀PEI涂层），不要用湿纸巾。' },
      { step: 2, title: '恢复附着力：温热水+洗洁精', detail: '当发现钢板不再粘时，用温热水加几滴洗洁精手洗钢板，冲洗干净后自然晾干。这能去除积累的隔离层，效果显著。' },
      { step: 3, title: 'PETG防黏处理', detail: 'PETG会和光滑PEI粘太死，导致钢板撕裂。打印PETG前在PEI上薄涂一层固体胶棒作为隔离层，打印完成后冷却脱板非常容易。' },
      { step: 4, title: '双面使用延长寿命', detail: 'PEI弹簧钢板两面均可使用，一面用旧后翻面继续用，相当于双倍寿命。纹路面适合需要底面纹理的模型，光滑面适合需要镜面底部的模型。' }
    ],
    tips: '取下模型时不要用铲刀硬铲——等钢板完全冷却后模型会自然脱落或轻松取下。强行铲会损伤PEI涂层。'
  },
  {
    id: 'multi-color-bleed',
    video: null,
    category: '进阶',
    printerType: 'FDM',
    title: '多色打印颜色互串',
    subtitle: '换色后仍有前色残留',
    emoji: '🌈',
    color: '#FD79A8',
    bgGradient: 'linear-gradient(135deg, #1a0010 0%, #2d0019 100%)',
    difficulty: '进阶',
    description: '双喷嘴或换色打印时，新颜色中混有旧颜色，导致颜色不纯、交界处出现混色条纹。',
    causes: ['换料清吐量不足', '打印温度过高导致颜色扩散', '换色塔位置或大小设置不当', '单喷嘴换色时冲刷不充分'],
    solutions: [
      { step: 1, title: '增加换色清吐量', detail: '在切片软件中增加换色时的清吐量（Purge Volume）。对于深色→浅色（如黑→白）需要更多清料（60–80mm³），浅色→深色可少些（30–40mm³）。' },
      { step: 2, title: '优化换色塔', detail: '换色塔（Purge Tower/Wipe Tower）要放在远离模型的位置，尺寸设置为15×15mm以上。启用"Smart Fill"让换色塔更高效。' },
      { step: 3, title: '降低打印温度', detail: '温度越高耗材流动性越强，越容易串色。在不影响层粘合的前提下适当降低5°C，减少颜色扩散。' },
      { step: 4, title: '使用颜色顺序优化', detail: 'Bambu Studio和PrusaSlicer都支持自动排列颜色打印顺序，让颜色差异大的组合之间有足够清料，减少总体废料量。' }
    ],
    tips: '深色耗材（黑、深蓝）对其他颜色的污染最强。如果经常做多色打印，建议把深色分配给AMS靠后的槽位，让它优先被清料。'
  },
  {
    id: 'part-strength',
    video: null,
    category: '切片',
    printerType: 'FDM',
    title: '打印件强度不足容易断裂',
    subtitle: '薄壁或受力部位断裂',
    emoji: '💪',
    color: '#E17055',
    bgGradient: 'linear-gradient(135deg, #1a0800 0%, #2d1200 100%)',
    difficulty: '需处理',
    description: '3D打印件在受力时断裂，或强度明显低于预期。FDM打印件强度具有各向异性，层间方向强度最弱。',
    causes: ['填充密度过低', '壁厚不足', '层高过大导致层间粘合差', '打印方向不合理', '材料本身强度不足'],
    solutions: [
      { step: 1, title: '增加填充密度和壁数', detail: '将填充密度从15%提高到40–60%，壁层数从2增加到4。这是提升强度最直接的方法，但会增加打印时间和耗材用量。' },
      { step: 2, title: '改变打印方向', detail: 'FDM层间（Z轴方向）强度只有同层（XY方向）的30–50%。将模型最需要承力的方向与XY层方向平行，可显著提升实际强度。' },
      { step: 3, title: '换用更强的耗材', detail: 'PLA强度有限。PETG刚韧兼备更不容易脆断；ABS强度高韧性好；PA尼龙强度最高且耐疲劳。受力零件建议用PETG以上材料。' },
      { step: 4, title: '使用更强的填充图案', detail: '将填充图案从Gyroid改为Cubic、3D Honeycomb或Tri-Hexagon，这些图案在三个轴向都有更好的力学性能，比线性填充强10–30%。' },
      { step: 5, title: '退火处理（PLA/PETG）', detail: '打印完成后在烤箱中70°C（PLA）或80°C（PETG）处理1小时，可以消除内应力、提升结晶度，强度提升15–25%，但会有轻微收缩需要预留余量。' }
    ],
    tips: '与其追求高密度填充，不如优化打印方向+增加壁厚——同等用料情况下后者强度提升更显著。'
  },
  {
    id: 'resin-suction-cup',
    video: null,
    category: '材料',
    printerType: 'SLA',
    title: '光固化离型失败/吸盘效应',
    subtitle: '打印件粘在FEP膜上而非平台',
    emoji: '🫙',
    color: '#A29BFE',
    bgGradient: 'linear-gradient(135deg, #0d0019 0%, #1a0033 100%)',
    difficulty: '需处理',
    description: '光固化打印时，每层曝光结束后平台上升，固化的树脂层应随平台剥离FEP膜。当离型力过大时，模型反而粘在FEP上造成打印失败。',
    causes: ['底层曝光时间过长导致过度粘附', '支撑截面积过大一次性离型困难', '树脂粘度高离型慢', 'FEP膜老化透光率下降导致过曝', '抬升速度过快'],
    solutions: [
      { step: 1, title: '减少底层曝光时间', detail: '底层曝光（Bottom Exposure）时间越长，树脂与FEP的粘附越强。在保证附着力的前提下将底层曝光从60秒降低到30–45秒，底层层数从5层降到3层。' },
      { step: 2, title: '降低提升速度', detail: '将平台提升速度（Lift Speed）从60mm/min降到30–40mm/min，让树脂有时间缓慢从FEP剥离，减少瞬间离型力。部分切片软件支持分段速度（先慢后快）。' },
      { step: 3, title: '优化支撑和模型方向', detail: '大面积平行于FEP的截面会产生极大吸盘效应。将模型倾斜15–30°打印，减少单层最大截面积；支撑点改为细点阵而非实心底座。' },
      { step: 4, title: '检查并清洁FEP膜', detail: '旧FEP膜因树脂残留透光率下降，导致实际曝光强于设定值。用软布擦净FEP两面，若有划痕或雾化应立即更换（通常每1–2kg树脂更换一次）。' }
    ],
    tips: 'ACF（防粘氟化膜）是nFEP的升级版，离型力比普通FEP低30–40%，非常推荐在打印大面积模型时使用。'
  },
  {
    id: 'resin-wash-cure',
    video: null,
    category: '材料',
    printerType: 'SLA',
    title: '光固化清洗固化问题',
    subtitle: '清洗不干净或固化过度',
    emoji: '🧪',
    color: '#74B9FF',
    bgGradient: 'linear-gradient(135deg, #001219 0%, #001f2d 100%)',
    difficulty: '常见',
    description: '光固化打印完成后需要清洗（去除未固化树脂）和二次固化（提升强度）。清洗不到位模型表面黏腻；过度固化则导致模型变脆开裂。',
    causes: ['酒精浓度不足或已饱和', '清洗时间不够或过长', '固化灯功率和时间不匹配', '中空模型内部积液未排干'],
    solutions: [
      { step: 1, title: '使用正确浓度酒精', detail: '推荐使用≥95%的工业酒精或异丙醇（IPA）。75%医用酒精含水量过高，会留下雾状水斑。清洗容器的酒精饱和后（颜色变黄绿）要及时更换。' },
      { step: 2, title: '控制清洗时间', detail: 'FDM/ABS树脂清洗3–5分钟；柔性树脂清洗1–2分钟（过长会导致膨胀变形）；工程树脂可清洗5–8分钟。建议分两桶清洗：第一桶粗洗2分钟，第二桶精洗1分钟。' },
      { step: 3, title: '晾干后再固化', detail: '清洗完毕后将模型放在通风处或用压缩空气吹干，确保表面酒精挥发干净后再放入固化箱。酒精未挥发就固化会导致表面发白或起泡。' },
      { step: 4, title: '中空模型开排液孔', detail: '有内腔的中空模型必须在底部开排液孔（直径≥3mm），否则内部积聚的未固化树脂无法清洗出来，会导致内部应力最终炸裂。' }
    ],
    tips: '过度固化的模型表面会变黄、变脆。光固化时间参考：普通树脂60W固化灯照射3–5分钟即可，阳光晒同样有效（晴天室外5–10分钟）。'
  },
  {
    id: 'klipper-setup',
    video: 'BV1924y167Gg',
    category: '进阶',
    printerType: 'FDM',
    title: 'Klipper固件入门与调试',
    subtitle: '安装配置常见问题',
    emoji: '🖥️',
    color: '#00CEC9',
    bgGradient: 'linear-gradient(135deg, #001a19 0%, #002d2b 100%)',
    difficulty: '进阶',
    description: 'Klipper是运行在树莓派上的开源3D打印固件，比Marlin支持更快速度、更精确的压力提前和实时调整。配置复杂但性能显著优于原厂固件。',
    causes: ['printer.cfg配置文件错误', 'Klippy服务无法启动', '归零失败或行程配置错误', '加速度传感器通信异常', 'Moonraker/Fluidd连接失败'],
    solutions: [
      { step: 1, title: '使用KIAUH一键安装', detail: '通过KIAUH（Klipper Installation And Update Helper）脚本安装Klipper+Moonraker+Fluidd/Mainsail，比手动安装少90%的错误概率。SSH进入树莓派运行：`git clone https://github.com/dw-0/kiauh && ./kiauh/kiauh.sh`' },
      { step: 2, title: '从机型配置模板开始', detail: '在Klipper的GitHub上找到与你打印机相同或相近的机型配置文件（config/printer-xxx.cfg），在其基础上修改，不要从空白开始，减少参数遗漏。' },
      { step: 3, title: '逐步测试归零流程', detail: '配置好后先发送FIRMWARE_RESTART，再测试各轴归零（HOME_X、HOME_Y、HOME_Z）。Z轴归零前确认行程限位器位置和方向配置正确，避免撞机。' },
      { step: 4, title: '校准Pressure Advance', detail: '运行PA校准测试（打印PA测试塔），在Fluidd界面实时调整PA值，找到角落最清晰的位置对应的PA值填入printer.cfg。通常FDM直驱为0.02–0.08，Bowden为0.4–0.8。' }
    ],
    tips: 'Klipper最大优势是"实时修改参数"——在打印过程中就能调整温度、速度、PA值，不需要重新切片。这是调试参数效率最高的固件。'
  },
  {
    id: 'first-layer-lines',
    video: null,
    category: '新手',
    printerType: 'FDM',
    title: '首层线条不均匀',
    subtitle: '第一层宽窄不一或中断',
    emoji: '〰️',
    color: '#FDCB6E',
    bgGradient: 'linear-gradient(135deg, #1a1200 0%, #2d1f00 100%)',
    difficulty: '常见',
    description: '第一层打印时线条宽窄不均、有的地方断线、有的地方堆叠——通常是热床不平或Z轴偏移（Baby Step）设置不精确导致的。',
    causes: ['热床四角高低不一', 'Z轴偏移（Z-offset）设置不准', '热床表面有异物或油污', '打印速度第一层过快'],
    solutions: [
      { step: 1, title: '执行自动调平（ABL）', detail: '现代打印机大多支持BLTouch/CR Touch自动调平，发送G29命令建立热床补偿网格。Bambu Lab用户直接在屏幕→校准→床网格运行。' },
      { step: 2, title: '实时调整Z偏移（Baby Step）', detail: '打印第一层时在屏幕上实时微调Z偏移：线条太细/断裂→Z轴向下（-0.05mm）；线条太宽/堆叠→Z轴向上（+0.05mm）。每次调0.05mm观察效果。' },
      { step: 3, title: '降低第一层速度', detail: '将第一层速度设置为正常速度的25–30%（如正常100mm/s则第一层25–30mm/s），给挤出机更多时间铺好耗材。' },
      { step: 4, title: '清洁热床表面', detail: '用异丙醇（IPA）擦拭热床，去除手油和残留。PEI板不需要其他处理；玻璃板可以涂胶棒提升附着力。' }
    ],
    tips: '判断第一层高度的标准：俯视看线条之间应该没有明显空隙且不堆叠，从侧面看线条应该轻微"压扁"呈椭圆形而非圆形。'
  },
  {
    id: 'shrinkage-tolerance',
    video: null,
    category: '材料',
    printerType: 'FDM',
    title: '耗材收缩导致尺寸偏差',
    subtitle: '打印件比设计尺寸偏小',
    emoji: '📏',
    color: '#636E72',
    bgGradient: 'linear-gradient(135deg, #0d0d0d 0%, #1a1a1a 100%)',
    difficulty: '进阶',
    description: '不同耗材冷却时的收缩率不同，导致打印件尺寸小于设计值。配合零件时孔径偏小、轴偏粗，组装困难。',
    causes: ['耗材热收缩系数较大（ABS/尼龙）', '切片软件未补偿收缩率', '打印温度过高热应力大', '冷却速度过快'],
    solutions: [
      { step: 1, title: '了解各材料收缩率', detail: 'PLA收缩率约0.2–0.4%，PETG约0.2%，ABS约0.7–0.8%，PA尼龙约1.0–1.5%，PC约0.5–0.7%。ABS和尼龙收缩最大，打精密件时需提前补偿。' },
      { step: 2, title: '在切片中设置收缩补偿', detail: 'Bambu Studio/OrcaSlicer中在耗材设置→收缩系数处填入对应数值（如ABS填1.008代表补偿0.8%）。Cura在"水平扩展"填入负值（如-0.2mm）补偿孔径。' },
      { step: 3, title: '校准实际收缩率', detail: '打印一个20mm标准校准块，实测X/Y/Z三个方向尺寸，计算实际收缩率=（设计尺寸-实测尺寸）/设计尺寸×100%，将结果填入切片补偿。' },
      { step: 4, title: '配合件预留公差', detail: '轴孔配合设计时预留0.2–0.3mm的间隙公差（孔比轴大0.2mm）；螺纹孔按M+0.3mm设计；卡扣配合预留0.5mm以上。' }
    ],
    tips: '同一品牌的耗材不同颜色收缩率可能不同（深色填料比例不同），建议每换一种新耗材都重新打校准块测量一次。'
  },
]

export const categories = ['全部', '新手', '进阶', '材料', '切片', '维护']