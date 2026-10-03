import { ChevronLeft, ChevronRight } from 'lucide-react'
import Button from './Button'

export default function Pagination({ page, totalPages, onPageChange }) {
  if (totalPages <= 1) return null
  return (
    <div className="flex items-center justify-between border-t border-slate-200 px-5 py-3">
      <p className="text-sm text-slate-600">
        Page <span className="font-medium">{page}</span> of <span className="font-medium">{totalPages}</span>
      </p>
      <div className="flex gap-2">
        <Button
          size="sm"
          variant="secondary"
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
          icon={ChevronLeft}
        >
          Prev
        </Button>
        <Button
          size="sm"
          variant="secondary"
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages}
        >
          Next
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>
    </div>
  )
}