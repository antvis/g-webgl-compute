// import { Container } from '../Container';
// import { Layout } from '../Layout';

// const rawData = [
//   { Class: 'First', Age: 'Adult', Sex: 'Male', Survived: 'Yes', N: 0 },
//   { Class: 'Second', Age: 'Adult', Sex: 'Male', Survived: 'Yes', N: 2 },
//   { Class: 'First', Age: 'Adult', Sex: 'Male', Survived: 'Yes', N: 5 },
//   { Class: 'First', Age: 'Adult', Sex: 'Male', Survived: 'Yes', N: 10 },
//   { Class: 'First', Age: 'Adult', Sex: 'Male', Survived: 'Yes', N: 14 },
//   { Class: 'First', Age: 'Adult', Sex: 'Male', Survived: 'Yes', N: 15 },
//   { Class: 'First', Age: 'Adult', Sex: 'Male', Survived: 'Yes', N: 21 },
// ];

// describe('Container', () => {
//   test('split container by categorical variable', () => {
//     const rootContainer = new Container({
//       label: 'root',
//       data: rawData,
//       parent: undefined,
//       children: undefined,
//       visualspace: {
//         width: 400,
//         height: 400,
//         posX: 0,
//         posY: 0,
//         padding: {
//           top: 10,
//           bottom: 10,
//           left: 10,
//           right: 10,
//         },
//       },
//     });

//     const children = rootContainer.makeContainersForCategoricalVar(
//       // @ts-ignore
//       rawData,
//       'Class',
//     );

//     expect(children.length).toBe(2);
//     expect(children[0].label).toBe('First');
//     expect(children[1].label).toBe('Second');
//     expect(children[0].data.length).toBe(6);
//     expect(children[1].data.length).toBe(1);
//   });

//   test('flatten root container', () => {
//     const rootContainer = new Container({
//       label: 'root',
//       data: rawData,
//       parent: undefined,
//       children: undefined,
//       visualspace: {
//         width: 400,
//         height: 400,
//         posX: 0,
//         posY: 0,
//         padding: {
//           top: 10,
//           bottom: 10,
//           left: 10,
//           right: 10,
//         },
//       },
//     });

//     const children = rootContainer.makeContainersForFlatten();

//     expect(children.length).toBe(7);
//   });

//   test('split container by numerical variable', () => {
//     const rootContainer = new Container({
//       label: 'root',
//       data: rawData,
//       parent: undefined,
//       children: undefined,
//       visualspace: {
//         width: 400,
//         height: 400,
//         posX: 0,
//         posY: 0,
//         padding: {
//           top: 10,
//           bottom: 10,
//           left: 10,
//           right: 10,
//         },
//       },
//     });

//     const children = rootContainer.makeContainersForNumericalVar(rawData, {
//       type: 'bin',
//       key: 'N',
//       numBin: 5,
//     });

//     expect(children.length).toBe(6);
//     expect(children[0].label).toBe('0-4.2');
//     expect(children[5].label).toBe('21-21');
//   });

//   test('should rotate correctly.', () => {
//     const layout = new Layout({
//       name: 'layout1',
//       type: 'gridxy',
//       subgroup: {
//         type: 'groupby',
//         key: 'Class',
//         isShared: false,
//       },
//       aspectRatio: 'fillX',
//       size: {
//         type: 'uniform',
//         isShared: false,
//       },
//       direction: 'LRBT',
//       align: 'LB',
//       margin: {
//         top: 5,
//         left: 5,
//         bottom: 5,
//         right: 5,
//       },
//       padding: {
//         top: 5,
//         left: 5,
//         bottom: 5,
//         right: 5,
//       },
//     });
//     layout.setParent(Layout.START_OF());
//     layout.setChild(Layout.END_OF());

//     const rootContainer = new Container({
//       label: 'root',
//       data: rawData,
//       parent: undefined,
//       children: undefined,
//       visualspace: {
//         width: 400,
//         height: 400,
//         posX: 0,
//         posY: 0,
//         padding: {
//           top: 10,
//           bottom: 10,
//           left: 10,
//           right: 10,
//         },
//       },
//     });

//     rootContainer.applyLayout(layout);

//     // console.log(rootContainer);
//   });
// });
