import { m } from "motion/react"
import * as React from "react"
import { cn } from "@/lib/utils"

const Table = ({
  ref,
  className,
  ...props
}: React.HTMLAttributes<HTMLTableElement> & {
  ref?: React.RefObject<HTMLTableElement>
}) => (
  <div className="relative w-full overflow-auto">
    <table
      ref={ref}
      className={cn("w-full caption-bottom text-sm", className)}
      {...props}
    />
  </div>
)
Table.displayName = "Table"

const TableHeader = ({
  ref,
  className,
  ...props
}: React.HTMLAttributes<HTMLTableSectionElement> & {
  ref?: React.RefObject<HTMLTableSectionElement>
}) => (
  <thead
    ref={ref}
    className={cn("[&_tr]:border-b-[1.5px]", className)}
    {...props}
  />
)
TableHeader.displayName = "TableHeader"
const MotionTableHeader = m.create(TableHeader)

const TableBody = ({
  ref,
  className,
  ...props
}: React.HTMLAttributes<HTMLTableSectionElement> & {
  ref?: React.RefObject<HTMLTableSectionElement>
}) => (
  <tbody
    ref={ref}
    className={cn("[&_tr:last-child]:border-0", className)}
    {...props}
  />
)
TableBody.displayName = "TableBody"

const TableFooter = ({
  ref,
  className,
  ...props
}: React.HTMLAttributes<HTMLTableSectionElement> & {
  ref?: React.RefObject<HTMLTableSectionElement>
}) => (
  <tfoot
    ref={ref}
    className={cn(
      "border-t bg-slate-100/50 font-medium [&>tr]:last:border-b-0",
      className,
    )}
    {...props}
  />
)
TableFooter.displayName = "TableFooter"

const TableRow = ({
  ref,
  className,
  ...props
}: React.HTMLAttributes<HTMLTableRowElement> & {
  ref?: React.RefObject<HTMLTableRowElement>
}) => (
  <tr
    ref={ref}
    className={cn(
      "group/table border-b-[1.5px] border-black dark:border-dark-border transition-colors data-[state=selected]:bg-gray-100",
      className,
    )}
    {...props}
  />
)
TableRow.displayName = "TableRow"
const MotionTableRow = m.create(TableRow)

const TableHead = ({
  ref,
  className,
  ...props
}: React.ThHTMLAttributes<HTMLTableCellElement> & {
  ref?: React.RefObject<HTMLTableCellElement>
}) => (
  <th
    ref={ref}
    className={cn(
      "h-12 px-4 text-left align-middle font-medium bg-container dark:bg-dark-container group-hover/table:bg-gray-50 dark:group-hover/table:bg-dark-focus text-black dark:text-dark-font [&:has([role=checkbox])]:pr-0",
      className,
    )}
    {...props}
  />
)
TableHead.displayName = "TableHead"

const TableCell = ({
  ref,
  className,
  ...props
}: React.TdHTMLAttributes<HTMLTableCellElement> & {
  ref?: React.RefObject<HTMLTableCellElement>
}) => (
  <td
    ref={ref}
    className={cn(
      "text-black dark:text-dark-font p-4 align-middle bg-container dark:bg-dark-container group-hover/table:bg-gray-50 dark:group-hover/table:bg-dark-focus [&:has([role=checkbox])]:pr-0",
      className,
    )}
    {...props}
  />
)
TableCell.displayName = "TableCell"

const TableCaption = ({
  ref,
  className,
  ...props
}: React.HTMLAttributes<HTMLTableCaptionElement> & {
  ref?: React.RefObject<HTMLTableCaptionElement>
}) => (
  <caption
    ref={ref}
    className={cn("mt-4 text-sm text-black dark:text-dark-font", className)}
    {...props}
  />
)
TableCaption.displayName = "TableCaption"

export {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  MotionTableHeader,
  TableRow,
  MotionTableRow,
}
