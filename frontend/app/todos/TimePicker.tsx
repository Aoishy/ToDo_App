'use client'

import { useState, useRef, useEffect } from 'react'
import styles from './timepicker.module.css'

interface TimePickerProps {
  value: string
  onChange: (value: string) => void
}

export default function TimePicker({ value, onChange }: TimePickerProps) {
  const [showPicker, setShowPicker] = useState(false)
  const [selectedDate, setSelectedDate] = useState('')
  const [selectedHour, setSelectedHour] = useState('12')
  const [selectedMinute, setSelectedMinute] = useState('00')
  const [selectedPeriod, setSelectedPeriod] = useState('PM')

  useEffect(() => {
    if (value) {
      const date = new Date(value)
      const dateStr = date.toISOString().split('T')[0]
      let hours = date.getHours()
      const minutes = date.getMinutes()
      const period = hours >= 12 ? 'PM' : 'AM'
      hours = hours % 12 || 12

      setSelectedDate(dateStr)
      setSelectedHour(hours.toString().padStart(2, '0'))
      setSelectedMinute(minutes.toString().padStart(2, '0'))
      setSelectedPeriod(period)
    }
  }, [value])

  const hours = Array.from({ length: 12 }, (_, i) => (i + 1).toString().padStart(2, '0'))
  const minutes = Array.from({ length: 60 }, (_, i) => i.toString().padStart(2, '0'))

  const handleConfirm = () => {
    if (selectedDate) {
      let hour = parseInt(selectedHour)
      if (selectedPeriod === 'PM' && hour !== 12) hour += 12
      if (selectedPeriod === 'AM' && hour === 12) hour = 0

      const datetime = `${selectedDate}T${hour.toString().padStart(2, '0')}:${selectedMinute}`
      const selectedDateTime = new Date(datetime)
      const now = new Date()

      // Check if selected time is in the past
      if (selectedDateTime < now) {
        alert('Cannot set a deadline in the past. Please select a future date and time.')
        return
      }

      onChange(datetime)
      setShowPicker(false)
    }
  }

  const handleClear = () => {
    setSelectedDate('')
    setSelectedHour('12')
    setSelectedMinute('00')
    setSelectedPeriod('PM')
    onChange('')
    setShowPicker(false)
  }

  const displayValue = value
    ? new Date(value).toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      })
    : 'Set deadline'

  const scrollToCenter = (ref: HTMLDivElement | null, value: string, items: string[]) => {
    if (!ref) return
    const index = items.indexOf(value)
    const itemHeight = 40
    ref.scrollTop = index * itemHeight - itemHeight
  }

  return (
    <div className={styles.container}>
      <button
        type="button"
        onClick={() => setShowPicker(true)}
        className={styles.triggerButton}
      >
        <span className={styles.triggerIcon}>🕒</span>
        <span className={styles.triggerText}>{displayValue}</span>
      </button>

      {showPicker && (
        <div className={styles.overlay} onClick={() => setShowPicker(false)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.header}>
              <h3 className={styles.title}>Set Deadline</h3>
            </div>

            <div className={styles.dateSection}>
              <label className={styles.dateLabel}>Date</label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
                className={styles.dateInput}
              />
            </div>

            <div className={styles.timeSection}>
              <label className={styles.timeLabel}>Time</label>
              <div className={styles.pickerContainer}>
                <div className={styles.pickerColumn}>
                  <div className={styles.pickerScroll}>
                    {hours.map((hour) => (
                      <div
                        key={hour}
                        className={`${styles.pickerItem} ${
                          selectedHour === hour ? styles.pickerItemActive : ''
                        }`}
                        onClick={() => setSelectedHour(hour)}
                      >
                        {hour}
                      </div>
                    ))}
                  </div>
                </div>

                <div className={styles.pickerDivider}>:</div>

                <div className={styles.pickerColumn}>
                  <div className={styles.pickerScroll}>
                    {minutes.map((minute) => (
                      <div
                        key={minute}
                        className={`${styles.pickerItem} ${
                          selectedMinute === minute ? styles.pickerItemActive : ''
                        }`}
                        onClick={() => setSelectedMinute(minute)}
                      >
                        {minute}
                      </div>
                    ))}
                  </div>
                </div>

                <div className={styles.pickerColumn}>
                  <div className={styles.pickerScroll}>
                    {['AM', 'PM'].map((period) => (
                      <div
                        key={period}
                        className={`${styles.pickerItem} ${
                          selectedPeriod === period ? styles.pickerItemActive : ''
                        }`}
                        onClick={() => setSelectedPeriod(period)}
                      >
                        {period}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <div className={styles.selectionIndicator}></div>
            </div>

            <div className={styles.actions}>
              <button
                type="button"
                onClick={handleClear}
                className={styles.clearButton}
              >
                Clear
              </button>
              <button
                type="button"
                onClick={handleConfirm}
                className={styles.confirmButton}
                disabled={!selectedDate}
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
