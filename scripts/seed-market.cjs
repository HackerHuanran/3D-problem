/**
 * 市场假数据种子脚本
 * 运行：node scripts/seed-market.js
 * 需要先设置环境变量：
 *   export CLOUDBASE_SECRET_ID=你的SecretId
 *   export CLOUDBASE_SECRET_KEY=你的SecretKey
 */

const cloudbase = require('@cloudbase/node-sdk')

const ENV_ID = process.env.VITE_TCB_ENV_ID || 'cloud1-d0gqkk2h2dea42d2b'

const app = cloudbase.init({
  secretId:  process.env.CLOUDBASE_SECRET_ID,
  secretKey: process.env.CLOUDBASE_SECRET_KEY,
  env: ENV_ID,
})
const db = app.database()

// ── 假用户 ──────────────────────────────────────────
const fakeUsers = [
  { uid: 'seed_user_001', username: '打印小王子',  avatar: '🦊', phone: '' },
  { uid: 'seed_user_002', username: 'FDM老张',     avatar: '🐻', phone: '' },
  { uid: 'seed_user_003', username: '树脂爱好者',  avatar: '🐸', phone: '' },
  { uid: 'seed_user_004', username: 'Bambu粉丝',   avatar: '🦁', phone: '' },
  { uid: 'seed_user_005', username: '3D打印工厂',  avatar: '🏭', phone: '' },
  { uid: 'seed_user_006', username: '模型师小李',  avatar: '🐼', phone: '' },
]

// ── 假市场帖子 ──────────────────────────────────────
function daysAgo(n) {
  return new Date(Date.now() - n * 86400000)
}

const fakePosts = [
  {
    user_id: 'seed_user_001',
    title: '求代打：手办底座 × 5个，要求精度高',
    description: '需要打印5个圆形手办展示底座，直径80mm，高15mm，表面要求光滑，可接受0.1mm层高。材料建议白色PLA或PETG均可。需要在一周内完成，同城取件或顺丰到付皆可。',
    category: '代打服务',
    budget: '80–120元',
    contact: 'wx: print_helper',
    status: '进行中',
    images: [],
    view_count: 34,
    interest_count: 3,
    created_at: daysAgo(2),
  },
  {
    user_id: 'seed_user_002',
    title: '出售：Bambu Lab X1C 九成新，配AMS',
    description: '购入半年，主要打过几百小时PLA。因升级换机出售，附赠一卷原装耗材（白色）、原装铲子和工具箱。机器无磕碰，打印质量完好。本地自提优先，也可快递（需买保险）。',
    category: '出售设备',
    budget: '5800元',
    contact: 'QQ: 3312xxxx',
    status: '进行中',
    images: [],
    view_count: 128,
    interest_count: 9,
    created_at: daysAgo(1),
  },
  {
    user_id: 'seed_user_003',
    title: '求购：光固化树脂，405nm，任意颜色',
    description: '需要灰色或米白色光固化树脂约3–5瓶（1kg/瓶），要求适合Chitubox切片，普通精度即可，不需要高精度工程树脂。有存货的朋友欢迎联系，可小批量收购。',
    category: '求购耗材',
    budget: '80元/瓶以内',
    contact: '微信：resin_buyer',
    status: '进行中',
    images: [],
    view_count: 56,
    interest_count: 2,
    created_at: daysAgo(3),
  },
  {
    user_id: 'seed_user_004',
    title: '技术求助：Bambu X1C打印TPU一直卡料',
    description: 'TPU硬度95A，用Bambu原装AMS送料，速度已降到20mm/s，还是会在AMS入口处卡住。有没有成功打过Bambu X1C+TPU的朋友？是不是必须关掉AMS直接外接？',
    category: '技术求助',
    budget: '',
    contact: '直接评论即可',
    status: '进行中',
    images: [],
    view_count: 72,
    interest_count: 0,
    created_at: daysAgo(1),
  },
  {
    user_id: 'seed_user_005',
    title: '代打服务：FDM/光固化均可，接小批量订单',
    description: '本人有Bambu X1C × 2台 + 光固化打印机，可接各类代打订单。FDM最大尺寸256×256×256mm，树脂最大192×120×245mm。支持PLA/PETG/ABS/TPU/灰色树脂。量大可议价，一般2–5天出件。',
    category: '代打服务',
    budget: '面议',
    contact: '微信：3d_factory_sh',
    status: '进行中',
    images: [],
    view_count: 203,
    interest_count: 14,
    created_at: daysAgo(5),
  },
  {
    user_id: 'seed_user_006',
    title: '求购：Ender-3系列配件，越多越好',
    description: '回收Ender-3/S1/Pro的闲置配件：挤出机、热床、导轨、屏幕、主板等均收。也收整机（九成新以上）。广州同城优先，外地快递也可以聊。价格公道，当天打款。',
    category: '求购耗材',
    budget: '价格面议',
    contact: 'TEL: 139xxxx（工作日）',
    status: '已完成',
    images: [],
    view_count: 45,
    interest_count: 5,
    created_at: daysAgo(10),
  },
  {
    user_id: 'seed_user_001',
    title: '求代打：无人机外壳，PETG材料，急',
    description: '需要打印一个FPV穿越机机架外壳，文件已经设计好（STL），尺寸大概230×150×60mm，要求PETG材料，颜色橙色或黄色。有壁厚要求（不低于2mm）。周三之前需要，可加急费。',
    category: '代打服务',
    budget: '150–200元',
    contact: 'wx: fpv_maker',
    status: '已完成',
    images: [],
    view_count: 28,
    interest_count: 2,
    created_at: daysAgo(12),
  },
  {
    user_id: 'seed_user_002',
    title: '出售：国产耗材清仓，PLA多色，低价',
    description: '清仓处理一批积压PLA耗材，品牌杂（拓竹、国产白牌均有），颜色丰富。1.75mm规格，大部分未开封，少部分开了但用了不到100g。15元/卷起，量大更优惠，北京同城。',
    category: '出售设备',
    budget: '15元/卷起',
    contact: 'wx: filament_sale',
    status: '进行中',
    images: [],
    view_count: 89,
    interest_count: 7,
    created_at: daysAgo(4),
  },
  {
    user_id: 'seed_user_003',
    title: '技术求助：PLA打完翘边，热床60°也不行',
    description: '用的是普通玻璃热床，PLA设置60°C热床，210°C喷嘴，第一层20mm/s，还是四角翘边。玻璃床有擦过酒精，没用胶棒。是不是必须用胶棒或者PEI板？求老手指点。',
    category: '技术求助',
    budget: '',
    contact: '评论区交流',
    status: '已完成',
    images: [],
    view_count: 94,
    interest_count: 0,
    created_at: daysAgo(7),
  },
  {
    user_id: 'seed_user_004',
    title: '求代打：建筑模型，精度要求高',
    description: '建筑事务所，需要打印一个1:100比例的住宅建筑模型，白色PLA，要求外墙纹路清晰、窗框完整。文件为多个零件分拆好的STL。预计总打印量约500g，有兴趣的工作室请报价。',
    category: '代打服务',
    budget: '500–800元',
    contact: 'email: arch_model@xxx.com',
    status: '进行中',
    images: [],
    view_count: 61,
    interest_count: 4,
    created_at: daysAgo(2),
  },
  {
    user_id: 'seed_user_005',
    title: '出售：Prusa MK3S+，全套配件，含MMU2',
    description: '组装版Prusa MK3S+，打印时间约800小时，日常维护良好，PEI板两块（一新一旧），MMU2S多色系统（可正常使用），全套工具。因工作室升级设备转让，可拆卸MMU2S单独出售。',
    category: '出售设备',
    budget: '3200元（含MMU2S）',
    contact: '微信：prusa_seller',
    status: '进行中',
    images: [],
    view_count: 147,
    interest_count: 6,
    created_at: daysAgo(3),
  },
  {
    user_id: 'seed_user_006',
    title: '求购：高温耗材，PC/ABS+，1kg以上',
    description: '工业零件需要，需要PC（聚碳酸酯）或ABS+耗材，1.75mm，透明或黑色优先，需要2–5kg。国产或进口均可，主要看质量稳定性。有货的朋友请报价，批量可长期合作。',
    category: '求购耗材',
    budget: '60–120元/kg',
    contact: '微信：industrial_3d',
    status: '进行中',
    images: [],
    view_count: 33,
    interest_count: 1,
    created_at: daysAgo(6),
  },
  {
    user_id: 'seed_user_001',
    title: '技术求助：切片后实际打印时间比预计长很多',
    description: 'Cura预计2小时，实际打了4小时才完成。打印机是Ender-3 V2，没有改过固件。是切片速度设置和实际不匹配？还是固件限速？怎么让实际速度匹配切片设置？',
    category: '技术求助',
    budget: '',
    contact: '评论区',
    status: '已完成',
    images: [],
    view_count: 115,
    interest_count: 0,
    created_at: daysAgo(9),
  },
  {
    user_id: 'seed_user_002',
    title: '代打：礼品定制，小批量（10–50个）',
    description: '擅长礼品类定制打印，可做公司logo定制摆件、纪念品、名片盒等。支持全彩树脂（外协）或单色FDM。提供后处理（打磨、上色、喷漆）服务。有商务需求欢迎洽谈合作。',
    category: '代打服务',
    budget: '视设计复杂度报价',
    contact: 'wx: gift_3d_print',
    status: '进行中',
    images: [],
    view_count: 78,
    interest_count: 5,
    created_at: daysAgo(8),
  },
  {
    user_id: 'seed_user_003',
    title: '出售：光固化套装，含清洗固化机',
    description: '出售Anycubic Photon Mono X 一台（使用约300小时），配套清洗固化机一台，FEP膜已换新，另附赠约2kg灰色树脂（未开封）。整套出售不拆散，成都同城可验货。',
    category: '出售设备',
    budget: '1600元整套',
    contact: 'wx: chengdu_resin',
    status: '已完成',
    images: [],
    view_count: 92,
    interest_count: 8,
    created_at: daysAgo(15),
  },
  {
    user_id: 'seed_user_004',
    title: '求购：二手直驱挤出机套件，Orbiter或BMG',
    description: '想给Ender-3升级直驱，寻找二手Orbiter 2.0或BMG克隆版挤出机套件（含电机）。新品也可以但希望价格合理，国内有现货发货更好。有意出售的朋友请联系。',
    category: '求购耗材',
    budget: '80–150元',
    contact: 'wx: extruder_buyer',
    status: '进行中',
    images: [],
    view_count: 44,
    interest_count: 2,
    created_at: daysAgo(4),
  },
  {
    user_id: 'seed_user_005',
    title: '技术求助：ABS打印件开裂，已用封闭箱',
    description: '买了个亚克力封闭箱，箱内温度能到45°C，但ABS打件还是开裂，层与层之间裂开。喷嘴240°C，热床105°C，风扇已关。是不是温度还不够？还是有其他原因？',
    category: '技术求助',
    budget: '',
    contact: '评论区',
    status: '进行中',
    images: [],
    view_count: 68,
    interest_count: 0,
    created_at: daysAgo(1),
  },
  {
    user_id: 'seed_user_006',
    title: '代打：医疗辅助器具，TPU材料，有设计图',
    description: '需要打印一批手部康复辅助支具，TPU材料（柔性），已有设计师出了STL文件，共3个型号，每款各10件。需要专业打印经验，尤其是TPU打印稳定性要求高。可提供测试件。',
    category: '代打服务',
    budget: '200–400元/款',
    contact: 'email: medical_3d@xxx.com',
    status: '进行中',
    images: [],
    view_count: 56,
    interest_count: 3,
    created_at: daysAgo(2),
  },
  {
    user_id: 'seed_user_001',
    title: '出售：一批PLA耗材，拓竹品牌，多色',
    description: '出售拓竹（Bambu Lab）原装PLA Basic耗材约15卷，颜色包括：白×3、黑×2、灰×2、红×2、蓝×2、绿×2、橙×2。全部未开封，因换打印机不兼容出售。杭州同城或快递。',
    category: '出售设备',
    budget: '55元/卷（原价79）',
    contact: 'wx: hzpla_sale',
    status: '进行中',
    images: [],
    view_count: 173,
    interest_count: 11,
    created_at: daysAgo(1),
  },
  {
    user_id: 'seed_user_002',
    title: '其他：3D打印爱好者线下交流，上海',
    description: '发起上海3D打印爱好者线下小聚，计划在周末下午在静安区咖啡馆举行，可以带自己的打印作品交流，也欢迎带问题来现场讨论。名额10人，免费参加，感兴趣的朋友私信报名。',
    category: '其他',
    budget: '免费',
    contact: 'wx: sh_3d_club',
    status: '已完成',
    images: [],
    view_count: 211,
    interest_count: 10,
    created_at: daysAgo(20),
  },
]

async function seed() {
  console.log('开始插入假数据...\n')

  // 插入用户 profiles
  console.log('插入用户数据...')
  for (const user of fakeUsers) {
    try {
      await db.collection('profiles').add({
        ...user,
        created_at: daysAgo(30),
      })
      console.log(`  ✓ ${user.username}`)
    } catch (e) {
      console.log(`  ⚠ ${user.username}: ${e.message}`)
    }
  }

  // 插入市场帖子
  console.log('\n插入市场帖子...')
  for (const post of fakePosts) {
    try {
      await db.collection('market_posts').add(post)
      console.log(`  ✓ ${post.title.slice(0, 25)}…`)
    } catch (e) {
      console.log(`  ✗ ${post.title.slice(0, 25)}: ${e.message}`)
    }
  }

  console.log('\n✅ 完成！共插入：')
  console.log(`   用户：${fakeUsers.length} 个`)
  console.log(`   帖子：${fakePosts.length} 条`)
}

seed().catch(console.error)
