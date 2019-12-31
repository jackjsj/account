<template>
  <div id="app" tabindex="1" @keyup.enter="focus" @keyup.esc="clear"
    @focus="focus">
    <div class="left">
      <p class="f18 b mc-green flex-none">快速算账</p>
      <div class="flex-auto flex-col ova">
        <!-- 表格 -->
        <a-table class="ova" bordered :dataSource="accounts" :columns="columns" :pagination="false">
          <template slot="price" slot-scope="text, record, index">
            <a-input tabindex="2" @change="(e)=>accounts[index].price = Number(e.currentTarget.value)" />
          </template>
          <template slot="cost" slot-scope="text, record, index">
            <a-input tabindex="-1" :value="text" @change="(e)=>accounts[index].cost = Number(e.currentTarget.value)" />
          </template>
          <template slot="operation" slot-scope="text, record, index">
            <a href="javascript:;" tabindex="-1" @click="accounts.splice(index,1)">删除</a>
          </template>
        </a-table>
        <!-- 导出 -->
        <div class="align-self-end flex-none mb20 mt10">
          <a-button @click="clearAccounts" tabindex="-1" type="primary" class="mt10">清空</a-button>
          <a-button @click="exportToExcel" tabindex="-1" type="primary" class="ml10 mt10">导出成Excel</a-button>
          <a-button @click="copyTable" tabindex="-1" type="primary" class="ml10 mt10">复制表格</a-button>
        </div>
      </div>
    </div>
    <div class="middle">
      <div class="input-wrapper">
        <p class="title">商品快搜</p>
        <p class="desc">
          1. 按回车键开始输入，按ESC键清除，选择完后自动复制<br>
          2. 左键点击标签可直接复制，并增加使用率<br>
          3. 右键点击标签可减少使用率
        </p>
        <a-auto-complete
          v-model="content"
          ref="input"
          :dataSource="dataSource"
          style="width: 100%; border-radius:0;"
          @select="onSelect"
          @search="handleSearch"
          :autoFocus="true"
          :backfill="true" />
      </div>
      <!-- 本月销量 -->
      <div class="ranking-list">
        <p class="sub-title">本月销量榜Top20 <span class="sub-title-desc">本月累计售出{{getCurMonthTotal}}件商品</span></p>
        <div class="tag-box">
          <a-tag :color="bg3()"
            v-for="item in getTop(cmHotProds,20)"
            v-show="item.value>0"
            :key="item.name"
            @click.prevent="onTagClick(item.name)"
            @click.right="(e)=>onRightClick(item.name,curMonth,e)">{{item.name}} {{item.value}}</a-tag>
        </div>
      </div>
      <div class="ranking-list">
        <p class="sub-title">上月销量榜Top20 <span class="sub-title-desc">上月累计售出{{getLastMonthTotal}}件商品</span></p>
        <div class="tag-box">
          <a-tag :color="bg3()"
            v-for="item in getTop(lmHotProds,20)"
            v-show="item.value>0"
            :key="item.name"
            @click.prevent="onTagClick(item.name)">{{item.name}} {{item.value}}</a-tag>
        </div>
      </div>
      <div class="ranking-list">
        <p class="sub-title">历史销量总榜Top20</p>
        <div class="tag-box">
          <a-tag :color="bg3()"
            v-for="item in getTop(totalProds,20)"
            v-show="item.value>0"
            :key="item.name"
            @click.prevent="onTagClick(item.name)">{{item.name}} {{item.value}}</a-tag>
        </div>
      </div>
    </div>
    <!-- 图表 -->
    <div class="right">
      <!-- 本月销量 -->
      <div class="chart" ref="curMonthChart"></div>
      <!-- 上月销量 -->
      <div class="chart" ref="lastMonthChart"></div>
      <div class="chart" ref="historyChart"></div>
    </div>
  </div>
</template>

<script>
import echarts from 'echarts';
import products from '@/data/products.json';
import moment from 'moment';
const curMonth = moment().format('YYYY-MM');
const lastMonth = moment()
  .subtract(1, 'M')
  .format('YYYY-MM');
function copyTable(json) {
  //列标题，逗号隔开，每一个逗号就是隔开一个单元格
  let str = `商品\t售价\t成本\t利润\n`;
  //增加\t为了不让表格显示科学计数法或者其他格式
  for (let i = 0; i < json.length; i++) {
    for (let item in json[i]) {
      str += `${json[i][item] + '\t'}`;
    }
    str += '\n';
  }
  copyContent(str);
}
function jsonToExcel(json) {
  //列标题，逗号隔开，每一个逗号就是隔开一个单元格
  let str = `商品,售价,成本,利润\n`;
  //增加\t为了不让表格显示科学计数法或者其他格式
  for (let i = 0; i < json.length; i++) {
    for (let item in json[i]) {
      str += `${json[i][item] + '\t'},`;
    }
    str += '\n';
  }
  copyContent(str);
  //encodeURIComponent解决中文乱码
  let uri = 'data:text/csv;charset=utf-8,\ufeff' + encodeURIComponent(str);
  //通过创建a标签实现
  let link = document.createElement('a');
  link.href = uri;
  //对下载的文件命名
  link.download = moment().format('YYYY-MM-DD') + '帐单.csv';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
//输出base64编码
function base64(s) {
  return window.btoa(unescape(encodeURIComponent(s)));
}
function guid() {
  function S4() {
    return (((1 + Math.random()) * 0x10000) | 0).toString(16).substring(1);
  }
  return (
    S4() +
    S4() +
    '-' +
    S4() +
    '-' +
    S4() +
    '-' +
    S4() +
    '-' +
    S4() +
    S4() +
    S4()
  );
}
function bg3() {
  const r = Math.floor(Math.random() * 127 + 65);
  const g = Math.floor(Math.random() * 127 + 65);
  const b = Math.floor(Math.random() * 127 + 65);
  return 'rgb(' + r + ',' + g + ',' + b + ')'; //所有方法的拼接都可以用ES6新特性`其他字符串{$变量名}`替换
}
function copyContent(content) {
  document.addEventListener('copy', save); // 监听浏览器copy事件
  document.execCommand('copy'); // 执行copy事件，这时监听函数会执行save函数。
  document.removeEventListener('copy', save); // 移除copy事件

  // 保存方法
  function save(e) {
    e.clipboardData.setData('text/plain', content); // 剪贴板内容设置
    e.preventDefault();
  }
}

function getTopN(prods, num) {
  let target;
  if (prods instanceof Array) {
    target = prods;
  } else {
    // prods对象转数组
    target = Object.keys(prods).map((item) => ({
      name: item,
      value: prods[item],
    }));
  }
  return target
    .sort((a, b) => {
      return b.value - a.value; // 降序
    })
    .slice(0, num);
}

function chartOption(prods, title) {
  const top = getTopN(prods, 10).filter((item) => item.value > 0);
  return {
    title: {
      text: title,
      textStyle: {
        color: '#217364',
      },
    },
    color: [bg3()],
    tooltip: {
      trigger: 'axis',
      axisPointer: {
        type: 'shadow', // 默认为直线，可选为：'line' | 'shadow'
      },
    },
    grid: {
      left: '5%',
      right: '5%',
      bottom: '5%',
      top: '50px',
      containLabel: true,
    },
    xAxis: [
      {
        type: 'category',
        data: top.map((item) => item.name),
        axisTick: {
          alignWithLabel: true,
        },
        axisLabel: {
          rotate: 90,
        },
        z: 10,
      },
    ],
    yAxis: [
      {
        type: 'value',
      },
    ],
    series: [
      {
        type: 'bar',
        barWidth: '60%',
        data: top.map((item) => item.value),
      },
    ],
  };
}

function pieChartOption(prods, title) {
  return {
    title: {
      text: title,
    },
    tooltip: {
      trigger: 'item',
      formatter: '{a} <br/>{b} : {c} ({d}%)',
    },
    legend: {
      type: 'scroll',
      orient: 'vertical',
      right: 10,
      top: 20,
      bottom: 20,
      data: Object.keys(prods),
    },
    series: {
      type: 'pie',
      radius: '55%',
      center: ['40%', '50%'],
      data: Object.values(prods),
      itemStyle: {
        emphasis: {
          shadowBlur: 10,
          shadowOffsetX: 0,
          shadowColor: 'rgba(0, 0, 0, 0.5)',
        },
      },
    },
  };
}

export default {
  name: 'app',
  data() {
    return {
      dataSource: [],
      content: '',
      hotProducts: {},
      curMonth,
      lastMonth,
      copyContent,
      bg3,
      accounts: [],
      columns: [
        {
          title: '商品名称',
          dataIndex: 'name',
        },
        {
          title: '售价',
          dataIndex: 'price',
          scopedSlots: { customRender: 'price' },
        },
        {
          title: '成本',
          dataIndex: 'cost',
          scopedSlots: { customRender: 'cost' },
        },
        {
          title: '利润',
          dataIndex: 'profit',
          customRender: (text, record, index) =>
            Number(record.price) - Number(record.cost),
        },
        {
          title: '操作',
          dataIndex: 'operation',
          scopedSlots: { customRender: 'operation' },
        },
      ],
    };
  },
  mounted() {
    // 从localstorage读取hotProducts
    this.hotProducts = JSON.parse(localStorage.getItem('hotProducts')) || {};
    this.accounts = JSON.parse(localStorage.getItem('accounts')) || [];
    // 初始化图表
    this.curMonthChart = echarts.init(this.$refs.curMonthChart);
    this.lastMonthChart = echarts.init(this.$refs.lastMonthChart);
    this.historyChart = echarts.init(this.$refs.historyChart);
  },
  watch: {
    hotProducts() {
      this.curMonthChart.setOption(chartOption(this.cmHotProds, '本月销量榜'));
      this.lastMonthChart.setOption(chartOption(this.lmHotProds, '上月销量榜'));
      this.historyChart.setOption(chartOption(this.totalProds, '历史销量榜'));
    },
  },
  computed: {
    getCurMonthTotal() {
      if (Object.values(this.cmHotProds).length > 0) {
        return Object.values(this.cmHotProds).reduce((cur, next) => cur + next);
      } else {
        return 0;
      }
    },
    getLastMonthTotal() {
      if (Object.values(this.lmHotProds).length > 0) {
        return Object.values(this.lmHotProds).reduce((cur, next) => cur + next);
      } else {
        return 0;
      }
    },
    lmHotProds() {
      return this.hotProducts[lastMonth] || {};
    },
    cmHotProds() {
      return this.hotProducts[curMonth] || {};
    },
    // 获取历史总销售情况
    totalProds() {
      return products.map((item) => {
        // 当前产品每个月的销售数量
        return {
          name: item.name,
          value: Object.values(this.hotProducts)
            .map((month) => month[item.name] || 0)
            .reduce((cur, next) => cur + next, 0),
        };
      });
    },
    // 获取topN
    getTop(prods, num) {
      return (prods, num) => getTopN(prods, num);
    },
  },
  methods: {
    getTableJson() {
      return this.accounts.map((item) => ({
        name: item.name,
        price: item.price,
        cost: item.cost,
        profit: Number(item.price) - Number(item.cost),
      }));
    },
    copyTable() {
      copyTable(this.getTableJson());
    },
    // 导出成Excel
    exportToExcel() {
      jsonToExcel(this.getTableJson());
    },
    handleSearch(value) {
      this.dataSource = !value
        ? []
        : products
            .map((item) => item.name)
            .filter((item) =>
              item.toLocaleLowerCase().includes(value.toLocaleLowerCase()),
            );
    },
    onSelect(value) {
      copyContent(value);
      // 在表格中添加一条记录
      this.accounts.push({
        key: guid(), // guid
        name: value,
        price: 0,
        cost: products.filter((item) => item.name === value)[0].cost,
      });
      localStorage.setItem('accounts', JSON.stringify(this.accounts));
      // 记录当前value，加入hotProducts的指定月份
      if (this.hotProducts[curMonth] === void 0) {
        this.hotProducts[curMonth] = {};
      }
      this.hotProducts[curMonth][value] =
        (this.hotProducts[curMonth][value] || 0) + 1;
      this.update();
      this.$nextTick(() => {
        this.clear();
      });
    },
    onTagClick(value) {
      this.onSelect(value);
    },
    focus() {
      this.$refs.input.focus();
    },
    clear() {
      this.content = '';
    },
    onRightClick(value, month, e) {
      e.preventDefault();
      if (value && this.hotProducts[month][value] > 0) {
        this.hotProducts[month][value] =
          (this.hotProducts[month][value] || 0) - 1;
        this.update();
      }
    },
    update() {
      this.curMonthChart.setOption(chartOption(this.cmHotProds, '本月销量榜'));
      this.lastMonthChart.setOption(chartOption(this.lmHotProds, '上月销量榜'));
      this.historyChart.setOption(chartOption(this.totalProds, '历史销量榜'));
      localStorage.setItem('hotProducts', JSON.stringify(this.hotProducts));
    },
    clearAccounts(){
      this.accounts = [];
      localStorage.setItem('accounts', JSON.stringify(this.accounts));
    }
  },
};
</script>

<style>
body {
  display: flex;
  justify-content: center;
}
#app {
  width: 100%;
  display: flex;
}
.left {
  width: 800px;
  display: flex;
  flex-direction: column;
  height: 100%;
  padding: 0 10px;
}
.middle {
  display: flex;
  flex-direction: column;
  flex: auto;
  border-right: 1px solid #ddd;
  border-left: 1px solid #ddd;
}
.mc-green {
  color: #217364;
}
.right {
  width: 400px;
  display: flex;
  flex-direction: column;
  height: 100%;
}
.chart {
  flex: 1;
}
*:focus {
  outline: none;
}
.title {
  font-size: 60px;
  font-weight: bold;
  text-align: center;
  color: #217364;
  margin-bottom: 20px;
}
.desc {
  font-size: 16px;
  text-align: left;
}
.input-wrapper {
  width: 480px;
  margin: 20px auto;
}
.ranking-list {
  width: 600px;
  margin: 10px auto;
}
.sub-title {
  font-size: 20px;
  font-weight: bold;
  color: #217364;
}
.ant-select-auto-complete.ant-select .ant-input {
  border-radius: 0;
  height: 40px !important;
  line-height: 40px !important;
}
.tag-box {
  margin: auto;
  margin-top: 20px;
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
}
.ant-tag {
  margin-bottom: 10px !important;
}
.sub-title-desc {
  font-size: 14px;
  font-weight: normal;
  color: #a9a9a9;
  margin-left: 10px;
}
.align-self-end {
  align-self: flex-end;
}
</style>
