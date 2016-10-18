/**
 * @copyright Maichong Software Ltd. 2016 http://maichong.it
 * @date 2016-10-11
 * @author Liang <liang@maichong.it>
 */

/* eslint no-use-before-define:0 new-cap:0 */

var tasks = [];
var current = null;

var start = Date.now();

var totalSuccess = 0;
var totalError = 0;

function print(message, color) {
  color = color || '#333';
  console.log('%c labrador-test %c %s', 'background:#44c;color:#fff', 'color:' + color, message);
}

function check() {
  if (current) return;
  current = tasks.shift();
  if (!current) {
    if (!start) return;
    if (Date.now() - start > 2000) {
      start = 0;
      console.log('\n---------------------------------------\n\n');
      print('已经完成所有test函数测试任务，共计：' + totalSuccess + '通过，' + totalError + '失败', totalError ? 'red' : 'green');
      console.log('\n---------------------------------------\n\n');
    } else {
      setTimeout(check, 500);
    }
    return;
  }
  console.log('\n---------------------------------------\n\n');
  current(function () {
    current = null;
    setTimeout(check, 100);
  });
}

function Test(Component, tests, testFile) {
  setTimeout(check, 500);
  if (Component.prototype && Component.prototype._init) {
    return TestComponent(Component, tests, testFile);
  }
  if (
    Component.default
    && Object.keys(Component).length === 1
    && Component.default.prototype
    && Component.default.prototype._init
  ) {
    var res = {};
    res.default = TestComponent(Component.default, tests, testFile);
    Object.defineProperty(res, '__esModule', { value: true });
    return res;
  }
  return TestLibrary(Component, tests, testFile);
}

function TestLibrary(Library, tests, testFile) {
  function testTask(done) {
    print('开始测试库 ' + testFile, '#05f');
    var queue = [];
    Object.keys(tests).forEach(function (name) {
      if (/^test/.test(name)) {
        queue.push({ name: name, fn: tests[name] });
      } else {
        print(testFile + ' 测试文件存在无效导出 ' + name, '#ca2');
      }
    });

    var name = '';
    var success = 0;
    var errors = 0;

    function onError(error) {
      print(testFile + '#' + name + ' 测试失败 ' + error.stack, 'red');
      errors++;
      totalError++;
      run();
    }

    function run() {
      var test = queue.shift();
      if (!test) {
        print(testFile + ' 中的test函数测试已完成,' + success + '通过,' + errors + '失败', errors ? 'red' : 'green');
        done();
        return;
      }
      name = test.name;

      try {
        var res = test.fn(Library);
        if (res && res.then) {
          res.then(function () {
            success++;
            totalSuccess++;
            run();
          }, onError);
        } else {
          success++;
          totalSuccess++;
          setTimeout(run, 10);
        }
      } catch (error) {
        onError(error);
      }
    }

    setTimeout(run, 10);
  }

  tasks.push(testTask);
  return Library;
}

function TestComponent(Component, tests, testFile) {
  var onReady = Component.prototype.onReady;

  var functions = ['onLoad', 'onReady', 'onShow', 'onHide', 'onUnload', 'onPullDownRefreash'];
  var invalidHandles = [];
  Component.prototype.onReady = function () {
    var me = this;
    if (onReady) {
      onReady.call(me);
    }

    function testTask(done) {
      print('开始测试组件 ' + testFile, '#2ab');
      var queue = [];
      Object.keys(tests).forEach(function (name) {
        if (/^test/.test(name)) {
          queue.push({
            name: name,
            fn: tests[name]
          });
        } else if (!/^handle/.test(name) && functions.indexOf(name) === -1) {
          print(testFile + ' 测试文件存在无效导出 ' + name, '#ca2');
        }
      });

      invalidHandles.forEach(function (name) {
        print(testFile + ' 存在测试函数' + name + ',但是不存在对应的组件方法', '#ca2');
      });

      var success = 0;
      var errors = 0;
      var name = '';

      function onError(error) {
        print(testFile + '#' + name + ' 测试失败 ' + error.stack, 'red');
        errors++;
        totalError++;
        run();
      }

      function run() {
        var test = queue.shift();
        if (!test) {
          print(testFile + ' 中的test函数测试已完成,' + success + '通过,' + errors + '失败', errors ? 'red' : 'green');
          done();
          return;
        }
        name = test.name;

        try {
          var res = test.fn(me);
          if (res && res.then) {
            res.then(function () {
              success++;
              totalSuccess++;
              run();
            }, onError);
          } else {
            success++;
            totalSuccess++;
            setTimeout(run, 10);
          }
        } catch (error) {
          onError(error);
        }
      }

      run();
    }

    tasks.push(testTask);
  };

  Object.keys(tests).forEach(function (name) {
    if (functions.indexOf(name) > -1 || /^handle/.test(name)) {
      var test = tests[name];
      var fn = Component.prototype[name];
      if (test && !fn) {
        invalidHandles.push(name);
        return;
      }
      var runner = function () {
        var me = this;
        var args = Array.prototype.slice.call(arguments);
        var onError = function (error) {
          print(testFile + '#' + name + ' 测试失败 ' + error.stack, 'red');
        };
        var res;
        try {
          let testArgs = [me, function () {
            return fn.apply(me, args);
          }].concat(args);
          res = test.apply(me, testArgs);
          if (res && res.then) {
            res.then(function () {
              print(testFile + '#' + name + ' 测试通过', 'green');
            }, onError);
          } else {
            print(testFile + '#' + name + ' 测试通过', 'green');
          }
        } catch (error) {
          onError(error);
        }
        runner = fn;
        return res;
      };
      Component.prototype[name] = function () {
        return runner.apply(this, arguments);
      };
    }
  });
  return Component;
}

module.exports = Test.default = Test;
