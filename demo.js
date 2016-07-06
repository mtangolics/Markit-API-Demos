var Events = new EventEmitter2({
    wildcard: true,
    delimiter: '::',
    newListener: false,
    maxListeners: 20
  });

var Utils = {
  FormatPrice: function(val) {
    return '$' + new Number(val).toFixed(2);
  },
  FormatPercent: function(val) {
    return new Number(val).toFixed(2) + '%';
  },
  FormatLarge: function(val) {
    var valNum = new Number(val);
    if(valNum > 1000000000) {
      return (valNum/1000000000).toFixed(1) + 'B';
    }
    else if(valNum > 1000000) {
      return (valNum/1000000).toFixed(1) + 'M';
    }
    else {
      return (valNum/1000).toFixed(1) + 'K';
    }
  },
  FormatChange: function(val,val2) {
    return (val >= 0 ? '+' : '') + new Number(val).toFixed(2) + ' ' + (val >= 0 ? '+' : '') + new Number(val).toFixed(2) + '%';
  }
};

var QuoteRibbonData = React.createClass({
  getDefaultProps: function() {
    return {color: false, value: 0, label: ''};
  },
  render: function() {
    return(
      <li className="quoteRibbonData"><span>{this.props.label}</span><div className={this.props.color}>{this.props.value}</div></li>
    )
  }
});

var QuoteRibbon = React.createClass({
  render: function() {
    var change = this.state.quoteData['Change'];
    var changePct = this.state.quoteData['ChangePercent'];
    return(
      <div className="quoteRibbonContainer hide">
        <h3>{this.state.quoteData['Name']}</h3>
        <ul>
          <QuoteRibbonData label="Last Price" value={Utils.FormatPrice(this.state.quoteData['LastPrice'])} />
          <QuoteRibbonData label="Change" value={Utils.FormatChange(change,changePct)} color={change >= 0 ? 'pos' : 'neg'} />
          <QuoteRibbonData label="Market Cap" value={Utils.FormatLarge(this.state.quoteData['MarketCap'])} />
          <QuoteRibbonData label="Volume" value={Utils.FormatLarge(this.state.quoteData['Volume'])} />
          <QuoteRibbonData label="High" value={Utils.FormatPrice(this.state.quoteData['High'])} />
          <QuoteRibbonData label="Low" value={Utils.FormatPrice(this.state.quoteData['Low'])} />
        </ul>
      </div>
    )
  },
  getInitialState: function() {
    return {quoteData: {}, symbol:''};
  },
  loadQuoteData: function() {
    $.ajax({
      url: this.props.api + this.state.symbol,
      dataType: 'jsonp',
      cache: false,
      success: function(data) {
        this.setState({quoteData: data});
        $('div.quoteRibbonContainer').removeClass('hide');
      }.bind(this),
      error: function(xhr, status, err) {
        console.error(this.props.api, status, err.toString());
      }.bind(this)
    });
  },
  componentDidMount: function() {
    var self = this;
    Events.on('symbol',function(symbol) {
      self.state.symbol = symbol;
      self.loadQuoteData();
    });
  }
});

var SymbolSearchResultRow = React.createClass({
  render: function() {
    return(
      <li onClick={this.onClick}>{this.props.symbol}<br/>{this.props.name}<div className="exchange">{this.props.exchange}</div></li>
    )
  },
  onClick: function() {
    $('#symbolInput').val(this.props.symbol);
    $('#symbolDropdown').addClass('hide');
    Events.emit('symbol',$('#symbolInput').val());
  }
});

var SymbolSearchDropdown = React.createClass({
  render: function() {
    var rows = [];
    if(this.props.results) {
      for (var i=0; i < Math.min(this.props.results.length,3); i++) {
          rows.push(<SymbolSearchResultRow symbol={this.props.results[i].Symbol} name={this.props.results[i].Name} exchange={this.props.results[i].Exchange} />);
      }
    }
    return (
      <div id="symbolDropdown">
        <ul id="dropdownList">
          {rows}
        </ul>
      </div>
    )
  }
});

var SymbolSearchButton = React.createClass({
  render: function() {
    return (
      <button id="symbolButton" onClick={this.onClick}>Go</button>
    )
  },
  onClick: function() {
    Events.emit('symbol',$('#symbolInput').val());
  }
});

var SymbolSearch = React.createClass({
  render: function() {
    return (
      <div className="symbolSearchContainer">
        <div className="symbolInputContainer">
          <label>Symbol: <input type="text" id="symbolInput" onKeyUp={this.onKeyUp} placeholder="Enter a symbol..."/></label>
          <SymbolSearchButton/>
        </div>
        <SymbolSearchDropdown results={this.state.data}/>
      </div>
    )
  },
  getInitialState: function() {
    return {data: []};
  },
  componentDidMount: function() {

  },
  onKeyUp: function(event) {
    this.loadResults();
  },
  loadResults: function() {
    var curVal = $('#symbolInput').val();
    if(curVal && curVal.length > 0 && curVal != this.lastSent) {
      if(this.ajaxCall) {
        this.ajaxCall.abort();
      }
      this.ajaxCall = $.ajax({
        url: this.props.api + curVal,
        dataType: 'jsonp',
        cache: false,
        success: function(data) {
          this.setState({data: data});
        }.bind(this),
        error: function(xhr, status, err) {
          console.error(this.props.api, status, err.toString());
        }.bind(this)
      });
      this.lastSent = curVal;
      $('#symbolDropdown').removeClass('hide');
    }
  }
});

var Chart = React.createClass({
  render: function() {
    return (
      <div id="chartContainer">
      </div>
    )
  },
  getInitialState: function() {
    return {chartData:[], symbol:''};
  },
  componentDidMount: function() {
    var self = this;
    Events.on('symbol',function(symbol) {
      self.state.symbol = symbol;
      self.loadChartData();
    });
  },
  processData: function(rawData) {
    var highData = [];
    if(rawData && rawData['Dates'] && rawData['Elements'] && rawData['Elements'][0]['DataSeries']) {
      var dates = rawData['Dates'].map(function(d) {
        return Date.parse(d);
      });
      var dataSeries = rawData['Elements'][0]['DataSeries'];
      if(dataSeries['close'] && dataSeries['close']['values']) {
        var prices = dataSeries['close']['values'];

        for(var i = 0; i < dates.length; i++) {
          highData.push([dates[i],prices[i]]);
        }
      }
    }

    this.state.chartData = highData;
    this.loadChart();
  },
  loadChartData: function() {

    var parameters = {
      "Normalized": false,
      "NumberOfDays": 365,
      "DataPeriod": "Day",
      "Elements": [{
          "Symbol": this.state.symbol,
          "Type": "price",
          "Params": ["c"]
      }]
    };

    $.ajax({
      url: this.props.api + encodeURIComponent(JSON.stringify(parameters)),
      dataType: 'jsonp',
      cache: false,
      success: function(data) {
        this.processData(data);
      }.bind(this),
      error: function(xhr, status, err) {
        console.error(this.props.api, status, err.toString());
      }.bind(this)
    });
  },
  loadChart: function() {
    $('#chartContainer').highcharts('StockChart', {
        rangeSelector : {
            selected : 1
        },

        title : {
            text : this.state.symbol + ' Stock Price'
        },

        series : [{
            name : this.state.symbol,
            data : this.state.chartData,
            tooltip: {
                valueDecimals: 2
            }
        }]
    });
  }
});

var InteractiveChart = React.createClass({
  render: function() {
    return (
      <div className="interactiveChartContainer">
        <SymbolSearch api={this.props.symbolapi}/>
        <QuoteRibbon api={this.props.quoteapi}/>
        <Chart api={this.props.chartapi}/>
      </div>
    )
  }
});

ReactDOM.render(
  <InteractiveChart
    symbolapi="http://dev.markitondemand.com/MODApis/Api/v2/Lookup/jsonp?input="
    chartapi="http://dev.markitondemand.com/MODApis/Api/v2/InteractiveChart/jsonp?parameters="
    quoteapi="http://dev.markitondemand.com/MODApis/Api/v2/Quote/jsonp?symbol="/>,
  $('#demo')[0]
);
