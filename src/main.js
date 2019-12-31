import Vue from "vue";
import Antd from 'ant-design-vue';
import App from './App';
import 'ant-design-vue/dist/antd.css';
import '@/styles/utils.css';

Vue.use(Antd);
Vue.config.productionTip = false;

new Vue({
  render: h => h(App)
}).$mount("#app");
