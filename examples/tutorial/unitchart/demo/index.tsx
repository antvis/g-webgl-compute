import { Chart } from '@antv/g-webgpu-unitchart';
import React, { useEffect, useState } from 'react';
import ReactDOM from 'react-dom';

let chart;

const App = React.memo(function Fruchterman() {
  const [item, setItem] = useState();
  const [tooltipPos, setTooltipPos] = useState([0, 0]);

  useEffect(() => {
    (async () => {
      const canvas = document.getElementById(
        'application',
      ) as HTMLCanvasElement;

      const groupByClassLayouts = [
        {
          name: 'layout1',
          type: 'gridxy',
          subgroup: {
            type: 'groupby',
            key: 'Class',
            isShared: false,
          },
          aspectRatio: 'fillX',
          size: {
            type: 'uniform',
            isShared: false,
          },
          direction: 'LRBT',
          align: 'LB',
          margin: {
            top: 5,
            left: 5,
            bottom: 5,
            right: 5,
          },
          padding: {
            top: 5,
            left: 5,
            bottom: 5,
            right: 5,
          },
        },
        {
          name: 'layout2',
          type: 'gridxy',
          subgroup: {
            type: 'flatten',
          },
          aspectRatio: 'maxfill',
          size: {
            type: 'uniform',
            isShared: false,
          },
          direction: 'LRBT',
          align: 'LB',
          margin: {
            top: 0,
            left: 0,
            bottom: 0,
            right: 0,
          },
          padding: {
            top: 5,
            left: 5,
            bottom: 5,
            right: 5,
          },
          sort: {
            key: 'Survived',
          },
        },
      ];
      const groupBySexLayouts = [
        {
          name: 'layout1',
          type: 'gridxy',
          subgroup: {
            type: 'groupby',
            key: 'Sex',
            isShared: false,
          },
          aspectRatio: 'fillX',
          size: {
            type: 'uniform',
            isShared: false,
          },
          direction: 'LRBT',
          align: 'LB',
          margin: {
            top: 5,
            left: 5,
            bottom: 5,
            right: 5,
          },
          padding: {
            top: 5,
            left: 5,
            bottom: 5,
            right: 5,
          },
        },
        {
          name: 'layout2',
          type: 'gridxy',
          subgroup: {
            type: 'flatten',
          },
          aspectRatio: 'maxfill',
          size: {
            type: 'uniform',
            isShared: false,
          },
          direction: 'LRBT',
          align: 'LB',
          margin: {
            top: 0,
            left: 0,
            bottom: 0,
            right: 0,
          },
          padding: {
            top: 5,
            left: 5,
            bottom: 5,
            right: 5,
          },
          sort: {
            key: 'Survived',
          },
        },
      ];
      const groupByAgeLayouts = [
        {
          name: 'layout1',
          type: 'gridxy',
          subgroup: {
            type: 'groupby',
            key: 'Age',
            isShared: false,
          },
          aspectRatio: 'fillX',
          size: {
            type: 'uniform',
            isShared: false,
          },
          direction: 'LRBT',
          align: 'LB',
          margin: {
            top: 5,
            left: 5,
            bottom: 5,
            right: 5,
          },
          padding: {
            top: 5,
            left: 5,
            bottom: 5,
            right: 5,
          },
        },
        {
          name: 'layout2',
          type: 'gridxy',
          subgroup: {
            type: 'flatten',
          },
          aspectRatio: 'maxfill',
          size: {
            type: 'uniform',
            isShared: false,
          },
          direction: 'LRBT',
          align: 'LB',
          margin: {
            top: 0,
            left: 0,
            bottom: 0,
            right: 0,
          },
          padding: {
            top: 5,
            left: 5,
            bottom: 5,
            right: 5,
          },
          sort: {
            key: 'Survived',
          },
        },
      ];
      chart = new Chart({
        canvas,
        title: 'Titanic',
        data: 'https://intuinno.github.io/unit/data/titanic.csv',
        width: 600,
        height: 600,
        padding: {
          top: 10,
          left: 30,
          bottom: 30,
          right: 10,
        },
        layouts: [
          { name: 'groupByClass', layouts: groupByClassLayouts },
          { name: 'groupBySex', layouts: groupBySexLayouts },
          { name: 'groupByAge', layouts: groupByAgeLayouts },
        ],
        mark: {
          shape: 'circle',
          color: {
            key: 'Survived',
            type: 'categorical',
          },
          size: {
            type: 'max',
            isShared: false,
          },
          isColorScaleShared: true,
        },
        onPick: (item, position) => {
          setItem(item);
          setTooltipPos(position);
        },
      });
      await chart.init();

      chart.render({
        layout: 'groupByClass',
      });
    })();

    return function cleanup() {
      chart.destroy();
    };
  }, []);

  const groupBySex = () => {
    if (chart) {
      chart.render({
        layout: 'groupBySex',
      });
    }
  };

  const groupByClass = () => {
    if (chart) {
      chart.render({
        layout: 'groupByClass',
      });
    }
  };

  const groupByAge = () => {
    if (chart) {
      chart.render({
        layout: 'groupByAge',
      });
    }
  };

  return (
    <>
      <div
        style={{
          marginBottom: 16,
        }}
      >
        <button onClick={groupBySex}>Group by Sex</button>
        <button onClick={groupByClass}>Group by Class</button>
        <button onClick={groupByAge}>Group by Age</button>
      </div>
      <canvas id="application" width="600" height="600" />
      <div
        style={{
          background: 'rgba(0,0,0,.65)',
          color: 'white',
          position: 'absolute',
          top: tooltipPos[1],
          left: tooltipPos[0],
          visibility: item ? 'visible' : 'hidden',
          padding: 4,
        }}
      >
        {item &&
          Object.keys(item).map((itemKey) => (
            <p key={itemKey}>
              {itemKey}: {item[itemKey]}
            </p>
          ))}
      </div>
    </>
  );
});

ReactDOM.render(<App />, document.getElementById('wrapper'));
