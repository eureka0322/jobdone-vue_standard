import Vue from 'vue';
import VueChartJs from 'vue-chartjs';


export default Vue.component('AffiliateDashboardChart', {
  extends: VueChartJs.Line,
  props: ['data', 'labels'],
  mounted () {
    const datasets = [];
    this.data.forEach((v, i) => {
      datasets.push({
        label: v.label,
        data: v.data,
        backgroundColor: 'transparent',
        pointBackgroundColor: v.color,
        borderColor: v.color,
        borderWidth: 1,
        pointRadius: 5,
        lineTension: 0
      })
    });
    this.renderChart({
      labels: this.labels,
      datasets
    },
    {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        yAxes: [{
          display: false
        }],
        xAxes: [{
          display: true,
          showLabels: false,
          gridLines: {
            display: true,
            color: '#E6E6E6',
            drawBorder: false,
            borderDash: [3, 3]
          },
          ticks: {
            display: false
          }
        }]
      },
      layout: {
        padding: {
          left: 10,
          right: 10,
          bottom: 10
        }
      },
      legend: {
        labels: {
          usePointStyle: true,
          boxWidth: 5
        }
      }
    })
  }

});
