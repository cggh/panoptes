import API from 'panoptes/API';
import customHandlebars from 'util/customHandlebars';

const hb = customHandlebars({
  dataset: 'testDataset'
});
const templateData = {data: 'DATA'};

jest.mock('../panoptes/API', () => ({
  query: jest.fn(() => Promise.resolve(
    [
      {colour: 'blue', size: 'small'},
      {colour: 'red', size: 'big'}
    ]
  ))
})
);


test('simple template renders', () => {
  let template = hb.compile('test {{data}}');
  return template(templateData).then((data) =>
    expect(data).toBe('test DATA'));
});

test('query simple', () => {
  let template = hb.compile('test{{#query table="simple_table"}} Entry:{{@index}},{{colour}},{{size}}{{/query}}');
  return template(templateData).then((data) =>
    expect(data).toBe('test Entry:0,blue,small Entry:1,red,big'));
});

test('query first and last', () => {
  let template = hb.compile('test{{#query table="simple_table"}}r{{#if @first}}first{{/if}}{{#if @last}}last{{/if}}{{/query}}');
  return template(templateData).then((data) =>
    expect(data).toBe('testrfirstrlast'));
});

test('query that returns no rows', () => {
  API.query.mockImplementationOnce(() => Promise.resolve([]));
  let template = hb.compile('test{{#query table="no_rows_table"}} Entry:{{colour}},{{size}}{{else}}empty{{/query}}');
  return template(templateData).then((data) =>
    expect(data).toBe('testempty'));
});

test('query template that refers to outer scope', () => {
  let template = hb.compile('test{{#query table="table"}} {{../data}}:{{colour}},{{size}}{{/query}}');
  return template(templateData).then((data) =>
    expect(data).toBe('test DATA:blue,small DATA:red,big'));
});

test('query with parameterised args', () => {
  API.query.mockClear();
  let template = hb.compile("test{{#query table='{{data}}' query='{{data}}' orderBy='[[\"asc\", \"{{data}}\"]]'}}{{/query}}");
  return template(templateData).then((data) => {
    expect(API.query.mock.calls[0][0]).toMatchObject({table: 'DATA', query: 'DATA', orderBy: [['asc', 'DATA']]});
  });
});

test('query nested with parameterised args by result of first query', () => {
  API.query.mockClear();
  let template = hb.compile('test{{#query table="table3" }} Outer:{{#query table="table4" query="{{colour}}"}} Nested:{{size}}{{/query}}{{/query}}');
  return template(templateData).then((data) => {
    expect(data).toBe('test Outer: Nested:small Nested:big Outer: Nested:small Nested:big');
    expect(API.query.mock.calls[0][0]).toMatchObject({table: 'table3'});
    expect(API.query.mock.calls[1][0]).toMatchObject({table: 'table4', query: 'blue'});
    expect(API.query.mock.calls[2][0]).toMatchObject({table: 'table4', query: 'red'});
  });
});

test('query passes columns along correctly', () => {
  API.query.mockClear();
  let template = hb.compile('test{{#query "colour" "size" table="table4" }}{{/query}}');
  return template(templateData).then((data) => {
    expect(API.query.mock.calls[0][0]).toMatchObject({table: 'table4', columns: ['colour', 'size']});
  });
});

test('can use a handlebars helper', () => {
  let template = hb.compile('test{{ordinalize 1}}');
  return template(templateData).then((data) => {
    expect(data).toBe('test1st');
  });
});

// NOTE: This isn't a test of the join, only the handlebars syntax parsing.
test('query with inner join', () => {
  API.query.mockClear();
  let template = hb.compile('test{{#query table="table3" joins=\'[{"type": "INNER", "foreignTable": "table4", "foreignColumn": "id", "column": "id"}]\'}} Entry:{{@index}},{{colour}},{{size}}{{/query}}');
  return template(templateData).then((data) =>
    expect(data).toBe('test Entry:0,blue,small Entry:1,red,big'));
});

test('query with groupBy', () => {
  API.query.mockClear();
  let template = hb.compile('test{{#query table="table3" groupBy=\'["colour", "size"]\'}} Entry:{{@index}},{{colour}},{{size}}{{/query}}');
  return template(templateData).then((data) =>
    expect(data).toBe('test Entry:0,blue,small Entry:1,red,big'));
});

test('query with start and stop', () => {
  API.query.mockClear();
  let template = hb.compile('test{{#query table="table3" start="2" stop="2"}} Entry:{{@index}},{{colour}},{{size}}{{/query}}');
  return template(templateData).then((data) =>
    expect(data).toBe('test Entry:0,blue,small Entry:1,red,big'));
});
