// src/data/problems.js
// 3D打印常见问题数据 - 共30个问题
import qiaobian from '../../public/images/problems/qiaobian.jpg';
import lasi from '../../public/images/problems/lasi.jpg';
import liekai from '../../public/images/problems/liekai.jpg';
import qianjichu from '../../public/images/problems/qianjichu.jpg';
import guojichu from '../../public/images/problems/guojichu.jpg';
import xiangjiao from '../../public/images/problems/xiangjiao.jpg';
import shouchao from '../../public/images/problems/shouchao.png';
import zhicheng from '../../public/images/problems/zhicheng.png';
import chaomian from '../../public/images/problems/chaomian.jpg';
import penzui from '../../public/images/problems/penzui.png';
import diyiceng from '../../public/images/problems/diyiceng.webp';
import cuowei from '../../public/images/problems/cuowei.jpg';
import du from '../../public/images/problems/du.webp';
export const problems = [
  // ─── 新手问题 ───
  {
    id: 'warping',
    category: '新手',
    title: '打印件翘边',
    subtitle: '底部脱离热床',
    emoji: '🌀',
    images: qiaobian,
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
    category: '新手',
    title: '拉丝现象',
    subtitle: '模型间出现细线',
    emoji: '🕸',
    images: lasi,
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
    category: '新手',
    title: '层间开裂',
    subtitle: '层与层之间分离',
    emoji: '💔',
    images: liekai,
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
    category: '新手',
    title: '欠挤出',
    subtitle: '打印线条缺失稀疏',
    emoji: '🫧',
    images: qianjichu,
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
    category: '新手',
    title: '过挤出',
    subtitle: '表面鼓包溢出',
    emoji: '💦',
    images: guojichu,
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
    category: '新手',
    title: '象脚效应',
    subtitle: '底层向外扩展',
    emoji: '🐘',
    images: xiangjiao,
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
    category: '新手',
    title: '耗材受潮',
    subtitle: '打印噼啪声、气泡',
    emoji: '💧',
    images: shouchao,
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
    category: '新手',
    title: '支撑难以去除',
    subtitle: '支撑与模型粘连',
    emoji: '🏗',
    images: zhicheng,
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
    category: '新手',
    title: '意大利面打印',
    subtitle: '打印件整体坍塌',
    emoji: '🍝',
    images: chaomian,
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
    category: '新手',
    title: '喷嘴不出丝',
    subtitle: '开始打印无耗材挤出',
    emoji: '⛔',
    images: penzui,
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
    category: '新手',
    title: '第一层不粘床',
    subtitle: '耗材粘不上热床',
    emoji: '🫠',
    images: diyiceng,
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
    category: '新手',
    title: '层移位 / 打印错位',
    subtitle: '某层突然偏移',
    emoji: '↔️',
    images: cuowei,
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
    category: '进阶',
    title: '喷嘴堵塞',
    subtitle: '无法正常出丝',
    emoji: '🚫',
    images: du,
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
  }
]

export const categories = ['全部', '新手', '进阶', '材料', '切片']