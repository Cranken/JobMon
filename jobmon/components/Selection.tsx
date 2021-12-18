import styles from "./Selection.module.css";

export interface SelectionProps {
  setChecked: (key: string, val: boolean) => void;
  items: { [key: string]: boolean };
  height?: string;
}

export const Selection = ({ setChecked, items, height }: SelectionProps) => {
  let elements: JSX.Element[] = [];

  let allChecked = true;
  elements.push(
    ...Object.keys(items).map((key) => {
      allChecked = allChecked && items[key];
      return (
        <SelectionItem
          key={key}
          value={key}
          onChange={setChecked}
          checked={items[key]}
        />
      );
    })
  );
  elements.unshift(
    <SelectionItem
      key="all"
      label="Select All"
      value="all"
      onChange={setChecked}
      checked={allChecked}
    />
  );

  return (
    <div
      style={{ height: height ? height : "auto" }}
      className={styles.selection}
    >
      {elements}
    </div>
  );
};

interface SelectionItemProps {
  label?: string;
  value: string;
  onChange: (key: string, val: boolean) => void;
  checked: boolean;
}

const SelectionItem = ({
  label,
  value,
  onChange,
  checked,
}: SelectionItemProps) => {
  const id = value + "_checkbox";
  return (
    <div className={styles.selectionItem}>
      <input
        type="checkbox"
        id={id}
        onChange={(event) => onChange(value, !checked)}
        checked={checked}
      />
      <label htmlFor={id}>{label ? label : value}</label>
    </div>
  );
};

export default Selection;
