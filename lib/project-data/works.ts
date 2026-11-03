import type { Project } from '../projects';

export const workProjects: Project[] = [
  {
    slug: 'verthys',
    index: '001',
    title: 'Verthys',
    latin: 'THE VAULT',
    category: 'SECURITY / DESKTOP',
    year: '2026',
    role: '设计 / 开发',
    status: '持续维护',
    summary:
      '面向 Windows 的私密数据管理器：C11 安全核心与 Tauri 前端严格分层，密钥只存在于核心 DLL。',
    statement: '加密不是一个开关，而是一条链路。',
    specimen: 'vault',
    specimenLabel: '安全容器 / ENCRYPTED VAULT',
    hero: '/projects/verthys/hero.svg',
    heroRatio: '1600 / 620',
    heroLabel: '项目档案 / PROJECT DOSSIER',
    diagram: {
      src: '/projects/verthys/architecture.svg',
      ratio: '1600 / 830',
      caption: 'SYSTEM LAYERING / 四层单向依赖',
    },
    facts: [
      { label: 'ROLE', value: '设计 / 开发' },
      { label: 'STACK', value: 'C11 / RUST / TAURI / VUE 3' },
      { label: 'STATUS', value: '持续维护' },
    ],
    chapters: [
      {
        index: '01',
        kicker: 'ORIGIN / 缘起',
        title: '先划出一条不能越过的边界',
        body: [
          'Verthys 面向 Windows，把敏感数据封装进 .verthys 加密容器。项目从第一天就确定了一条边界：密钥只存在于 C11 编写的安全核心，UI 与调度层不接触任何密钥材料。',
          '这不是一条使用约定，而是分层约束。即使前端被替换、命令被伪造，密钥也不会出现在 L4。',
        ],
      },
      {
        index: '02',
        kicker: 'SYSTEM / 构造',
        title: '四层单向依赖',
        body: [
          'L4 是 Tauri + Vue 3，只负责渲染与 invoke；L3 是 Rust 控制器与 verthys-worker 子进程，通过 stdin/stdout JSON 行协议通信；L2 是 C11 核心 DLL，承担 api、crypto、container、index、transaction、security 六个子域；L1 是 .verthys 容器、pepper.bin 与附属数据目录。',
          '扫描结果通过命名共享内存零拷贝传递。上层只调用下层公开接口，下层不信任上层。',
        ],
      },
      {
        index: '03',
        kicker: 'CALIBRATION / 校准',
        title: '把加密做成一条链路',
        body: [
          '容器 V3 用三份超级块和 2/3 法定人数提交与读取；WAL 事务分为六个阶段；密钥体系分四级，按 90 天或 10k 次操作轮换。解锁流程从 S0 走到 S6，密钥与明文只在 CNG 内核托管。',
          '当一个副本损坏时可以恢复而不是丢失。安全能力被写成结构，而不是散落在提示文案里。',
        ],
      },
    ],
    metrics: [
      { value: '04', label: '层单向依赖' },
      { value: '06', label: '阶段事务' },
      { value: '00', label: 'UI 密钥接触' },
    ],
    stack: ['C11', 'RUST', 'TAURI', 'VUE 3'],
    liveHref: 'https://github.com/K1Super/Verthys',
    liveLabel: '查看源码',
  },
  {
    slug: 'terra-scout',
    index: '002',
    title: 'Terra Scout',
    latin: 'THE ORCHESTRATOR',
    category: 'PLATFORM / ORCHESTRATION',
    year: '2026',
    role: '设计 / 开发',
    status: '已完成',
    summary:
      '环境感知编排平台：识别项目语言与版本约束，按需装配隔离 SDK，并在本机完成依赖安装与任务执行。',
    statement: '环境应该是被编排的，而不是被手工配置的。',
    specimen: 'scout',
    specimenLabel: '任务流水线 / ORCHESTRATION PIPELINE',
    facts: [
      { label: 'ROLE', value: '设计 / 开发' },
      { label: 'STACK', value: 'ELECTRON / REACT / SPRING BOOT / H2' },
      { label: 'STATUS', value: '已完成' },
    ],
    chapters: [
      {
        index: '01',
        kicker: 'ORIGIN / 缘起',
        title: '先识别项目，再准备环境',
        body: [
          '导入一个项目时，Terra Scout 递归解析 Maven 父子 POM 与 package.json，同时读取 .nvmrc 和 engines.node，识别语言类型和版本约束。',
          '用户不再需要手工对齐 JDK、Python、Node 与 Go 的版本；环境从项目清单里推导出来。',
        ],
      },
      {
        index: '02',
        kicker: 'SYSTEM / 构造',
        title: '单机内核，零外部中间件',
        body: [
          'Electron + React 前端通过 127.0.0.1 与带 Token 鉴权的 Spring Boot 内核通信；内核内嵌 H2，不依赖外部数据库或消息队列。首启自动生成 H2 密码并持久化。',
          'SDK 生命周期覆盖版本目录聚合、EOL 过滤、SHA-256 校验、断点续传与可取消安装；九步任务流水线用心跳自上报，失败按 MAX_RETRY=3 重试。',
        ],
      },
      {
        index: '03',
        kicker: 'CALIBRATION / 校准',
        title: '把质量门禁放进构建',
        body: [
          'Maven verify 同时执行 Checkstyle、438+ 单元测试与 JaCoCo 覆盖率门禁（≥80%）；命令白名单、操作审计与诊断包导出让本机运行也可被追溯。',
          '单机绑定不是妥协，而是一条明确的安全边界。',
        ],
      },
    ],
    metrics: [
      { value: '09', label: '步任务流水线' },
      { value: '04', label: '语言运行时' },
      { value: '438+', label: '单元测试' },
    ],
    stack: ['ELECTRON', 'REACT', 'SPRING BOOT', 'H2'],
    liveHref: 'https://github.com/K1Super/Terra-Scout',
    liveLabel: '查看源码',
  },
  {
    slug: 'acme-desk',
    index: '003',
    title: 'AcmeDesk',
    latin: 'THE CERTIFICATE DESK',
    category: 'OPS / CERTIFICATES',
    year: '2026',
    role: '设计 / 开发',
    status: '已完成',
    summary:
      '运行在本机的证书管理台：通过 SSH 调用远端 acme.sh，把签发、预检、续期、吊销与下载收进一个界面。',
    statement: '证书不该靠记忆维护，而该有一套可审计的操作台。',
    specimen: 'cert',
    specimenLabel: '证书台账 / CERTIFICATE LEDGER',
    facts: [
      { label: 'ROLE', value: '设计 / 开发' },
      { label: 'STACK', value: 'NODE.JS / SSH / ACME.SH' },
      { label: 'STATUS', value: '已完成' },
    ],
    chapters: [
      {
        index: '01',
        kicker: 'ORIGIN / 缘起',
        title: '证书维护不该散落在终端历史里',
        body: [
          '续期、吊销、下载和预检通常散落在不同终端会话里。AcmeDesk 把它们收进一个只监听 127.0.0.1 的本地管理台。',
          '配置只保存 SSH 主机、端口、用户、私钥路径与 acme.sh 目录；私钥内容不读取、不上传。',
        ],
      },
      {
        index: '02',
        kicker: 'SYSTEM / 构造',
        title: '通过 SSH 调用真实的 acme.sh',
        body: [
          '清单解析证书、SAN、密钥类型、到期时间与自动续期时间，区分正式与测试证书；签发支持多域名、校验目录、账户邮箱、RSA/ECDSA 与 staging。',
          '预检会检查域名解析与 .well-known/acme-challenge 的 HTTP 响应，提前暴露重定向、403 与连接失败。',
        ],
      },
      {
        index: '03',
        kicker: 'CALIBRATION / 校准',
        title: '一个任务，一条清晰的终止链',
        body: [
          '同一时刻只执行一个远端任务，实时输出日志并支持取消；取消、超时或服务退出都会尝试按远端进程组终止并写入历史。',
          '任务包装优先使用 setsid -w，否则用 ps/awk 获取进程组；两者都不可用时拒绝启动，避免留下无法定位的远端进程。',
        ],
      },
    ],
    metrics: [
      { value: '01', label: '同时仅一个远端任务' },
      { value: '06', label: '类证书操作' },
      { value: '00', label: '公网监听端口' },
    ],
    stack: ['NODE.JS', 'SSH', 'ACME.SH'],
    liveHref: 'https://github.com/K1Super/AcmeDesk',
    liveLabel: '查看源码',
  },
  {
    slug: 'relivus',
    index: '004',
    title: 'Relivus',
    latin: 'THE DATA FORGE',
    category: 'DATA / GENERATION',
    year: '2026',
    role: '设计 / 开发',
    status: '已完成',
    summary:
      '面向 MySQL 与 PostgreSQL 的可视化测试数据工厂：结构解析、数据生成、脱敏与实时进度在同一条任务链里完成。',
    statement: '测试数据应该像真实数据一样有结构，但不该携带真实身份。',
    specimen: 'relivus',
    specimenLabel: '数据生成 / MASKED DATASET',
    facts: [
      { label: 'ROLE', value: '设计 / 开发' },
      { label: 'STACK', value: 'SPRING BOOT / REACT / MYSQL / POSTGRESQL' },
      { label: 'STATUS', value: '已完成' },
    ],
    chapters: [
      {
        index: '01',
        kicker: 'ORIGIN / 缘起',
        title: '测试数据要像真的，但不能是真人',
        body: [
          'Relivus 面向 MySQL 与 PostgreSQL，连接密码使用 AES-256-GCM 加密存储，列表接口不回显明文。',
          '目标是让测试数据保留真实结构和语义，同时不携带生产环境的身份信息。',
        ],
      },
      {
        index: '02',
        kicker: 'SYSTEM / 构造',
        title: '先理解结构，再生成数据',
        body: [
          '解析表结构时做外键拓扑排序、检查约束感知与方言差异适配；数据生成由本地 Faker 与 AI 增强组成，AI 失败会自动降级而不中断任务。',
          '脱敏支持多算法，并保证跨表关联的一致性；生成结果可以在线回看，不需要连接数据库。',
        ],
      },
      {
        index: '03',
        kicker: 'CALIBRATION / 校准',
        title: '把进度和结果放在同一屏',
        body: [
          '任务通过 SSE 推送实时进度，操作历史与审计日志统一记录；六位三段式错误码让失败原因可以被定位。',
          '结构、生成、脱敏、预览都在同一条任务链里完成，测试数据不再是临时脚本的副产物。',
        ],
      },
    ],
    metrics: [
      { value: '02', label: '数据库方言' },
      { value: 'AES-256', label: '连接密码加密' },
      { value: 'SSE', label: '实时进度' },
    ],
    stack: ['SPRING BOOT', 'REACT', 'MYSQL', 'POSTGRESQL'],
    liveHref: 'https://github.com/K1Super/Relivus',
    liveLabel: '查看源码',
  },
];
