import {
  Alert,
  Button,
  DatePicker,
  Form,
  Input,
  Modal,
  Select,
  Spin,
  message,
} from 'antd';
import { useCallback, useEffect, useState } from 'react';
import dayjs, { type Dayjs } from 'dayjs';
import {
  isSessionIdleExpiredError,
  type AppointmentRecord,
  type AuthSession,
  type ConsultationStartResponse,
  type ConsultationSubmitResponse,
} from '../lib/api';
import { getGenericErrorMessage } from '../lib/errors';
import { SAModalHeader } from '../components/common';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import {
  createAppointmentAction,
  getAppointmentAvailabilityAction,
  updateAppointmentAction,
} from '../store/appointments/action';
import {
  selectAppointmentAvailabilityLoading,
  selectAppointmentAvailabilitySlots,
  selectAppointmentMutating,
} from '../store/appointments/selector';
import {
  clearAvailabilitySlots,
  setAvailabilitySlots,
} from '../store/appointments/slice';
import {
  startConsultationAction,
  submitConsultationAction,
} from '../store/consultation/action';
import {
  selectConsultationError,
  selectConsultationLoadingStart,
  selectConsultationResult,
  selectConsultationStartResult,
  selectConsultationSubmitting,
} from '../store/consultation/selector';
import {
  clearConsultation,
  clearConsultationResult,
} from '../store/consultation/slice';
import { getServicesAction } from '../store/services/action';
import {
  selectActiveServices,
  selectServicesLoading,
} from '../store/services/selector';
import './makeAppointment.css';

interface MakeAppointmentModalProps {
  open: boolean;
  authSession: AuthSession | null;
  editingAppointment?: AppointmentRecord | null;
  onClose: () => void;
  onBooked: () => void;
}

type AppointmentFormValues = {
  serviceId?: string;
  appointmentDate?: Dayjs;
  appointmentTime?: string;
};

type ConsultationAnswers = Record<string, string>;

function parseAppointmentDateTime(value: string) {
  const [datePart = '', timePart = ''] = value.split(', ');
  const [day, month, year] = datePart.split('/').map(Number);
  const [hourText = '', minuteText = ''] = timePart.split(':');
  const hour = Number(hourText);
  const minute = Number(minuteText);

  if (
    !Number.isInteger(day) ||
    !Number.isInteger(month) ||
    !Number.isInteger(year) ||
    !Number.isInteger(hour) ||
    !Number.isInteger(minute)
  ) {
    return null;
  }

  return dayjs(new Date(year, month - 1, day, hour, minute));
}

function getAppointmentSlot(appointment: AppointmentRecord) {
  const startAt = parseAppointmentDateTime(appointment.startAt);
  const endAt = parseAppointmentDateTime(appointment.endAt);

  if (!startAt || !endAt) {
    return '';
  }

  return `${startAt.format('HH:mm')}-${endAt.format('HH:mm')}`;
}

function formatSlotTime(timeText: string) {
  const [hourText = '', minuteText = ''] = timeText.split(':');
  const hour = Number(hourText);
  const minute = Number(minuteText);

  if (
    !Number.isInteger(hour) ||
    !Number.isInteger(minute) ||
    hour < 0 ||
    hour > 23 ||
    minute < 0 ||
    minute > 59
  ) {
    return timeText;
  }

  const displayHour = hour % 12 || 12;
  const period = hour >= 12 ? 'PM' : 'AM';

  return `${displayHour}:${minuteText.padStart(2, '0')} ${period}`;
}

function formatAppointmentSlot(slot: string) {
  const [startTime = '', endTime = ''] = slot.split('-');

  if (!startTime || !endTime) {
    return slot;
  }

  return `${formatSlotTime(startTime)} - ${formatSlotTime(endTime)}`;
}

function getSafetyNotesText(result: ConsultationSubmitResponse) {
  return result.safetyNotes
    .map((note) => `[${note.severity.toUpperCase()}] ${note.message}`)
    .join('\n');
}

function getConsultationAnswersComplete(
  startResult: ConsultationStartResponse | null,
  answers: ConsultationAnswers,
) {
  if (!startResult) {
    return false;
  }

  return startResult.questions.every(
    (question) => !question.required || Boolean(answers[question.id]?.trim()),
  );
}

export default function MakeAppointmentModal({
  open,
  authSession,
  editingAppointment,
  onClose,
  onBooked,
}: MakeAppointmentModalProps) {
  const dispatch = useAppDispatch();
  const [messageApi, contextHolder] = message.useMessage();
  const services = useAppSelector(selectActiveServices);
  const servicesLoading = useAppSelector(selectServicesLoading);
  const slots = useAppSelector(selectAppointmentAvailabilitySlots);
  const slotsLoading = useAppSelector(selectAppointmentAvailabilityLoading);
  const confirmLoading = useAppSelector(selectAppointmentMutating);
  const consultationStartResult = useAppSelector(
    selectConsultationStartResult,
  );
  const consultationResult = useAppSelector(selectConsultationResult);
  const consultationLoadingStart = useAppSelector(
    selectConsultationLoadingStart,
  );
  const consultationSubmitting = useAppSelector(selectConsultationSubmitting);
  const consultationError = useAppSelector(selectConsultationError);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [currentSlotPulseKey, setCurrentSlotPulseKey] = useState(0);
  const [consultationAnswers, setConsultationAnswers] =
    useState<ConsultationAnswers>({});
  const [form] = Form.useForm<AppointmentFormValues>();
  const selectedServiceId = Form.useWatch('serviceId', form);
  const selectedAppointmentDate = Form.useWatch('appointmentDate', form);
  const isEditMode = Boolean(editingAppointment);
  const currentConsultationStartResult =
    consultationStartResult?.service.id === selectedServiceId
      ? consultationStartResult
      : null;
  const currentConsultationResult =
    consultationResult?.service.id === selectedServiceId
      ? consultationResult
      : null;
  const matchedBarberId = currentConsultationResult?.matchedBarber.id;
  const isConsultationReady = isEditMode || Boolean(matchedBarberId);
  const areConsultationAnswersComplete = getConsultationAnswersComplete(
    currentConsultationStartResult,
    consultationAnswers,
  );
  const currentAppointmentDate = editingAppointment
    ? parseAppointmentDateTime(editingAppointment.startAt)
    : null;
  const currentAppointmentDateKey =
    currentAppointmentDate?.format('YYYY-MM-DD');
  const selectedAppointmentDateKey =
    selectedAppointmentDate?.format('YYYY-MM-DD');
  const isCurrentAppointmentDateSelected =
    isEditMode &&
    Boolean(currentAppointmentDateKey) &&
    currentAppointmentDateKey === selectedAppointmentDateKey;
  const currentAppointmentSlot = editingAppointment
    ? getAppointmentSlot(editingAppointment)
    : '';
  const currentAppointmentServiceName = editingAppointment?.serviceName ?? '';
  const shouldShowCurrentAppointmentSlot =
    isCurrentAppointmentDateSelected && Boolean(currentAppointmentSlot);
  const availableSlots = isEditMode
    ? slots.filter(
        (slot) =>
          !shouldShowCurrentAppointmentSlot || slot !== currentAppointmentSlot,
      )
    : slots;
  const hasAppointmentChange =
    !isEditMode ||
    Boolean(
      selectedSlot &&
      selectedAppointmentDateKey &&
      (selectedSlot !== currentAppointmentSlot ||
        selectedAppointmentDateKey !== currentAppointmentDateKey),
    );
  const showNoAvailabilityMessage =
    Boolean(selectedServiceId && selectedAppointmentDate) &&
    !slotsLoading &&
    !shouldShowCurrentAppointmentSlot &&
    slots.length === 0;
  const showNoAlternativeSlotsMessage =
    isEditMode &&
    shouldShowCurrentAppointmentSlot &&
    !slotsLoading &&
    availableSlots.length === 0;

  const loadAvailabilityFor = useCallback(
    async (
      serviceId: string,
      appointmentDate: Dayjs,
      preferredSlot?: string,
      staffId?: string,
    ) => {
      setSelectedSlot(preferredSlot ?? null);

      try {
        const response = await dispatch(
          getAppointmentAvailabilityAction({
            serviceId,
            date: appointmentDate.format('YYYY-MM-DD'),
            staffId,
            excludeAppointmentId: editingAppointment?.id,
          }),
        ).unwrap();
        const nextSlots =
          preferredSlot && !response.includes(preferredSlot)
            ? [preferredSlot, ...response]
            : response;

        if (nextSlots !== response) {
          dispatch(setAvailabilitySlots(nextSlots));
        }
      } catch (error) {
        if (isSessionIdleExpiredError(error)) {
          return;
        }

        dispatch(clearAvailabilitySlots());
        messageApi.error(
          getGenericErrorMessage('Load appointment availability', error),
        );
      }
    },
    [dispatch, editingAppointment?.id, messageApi],
  );

  useEffect(() => {
    if (!open || !authSession) {
      return;
    }

    form.resetFields();
    dispatch(clearAvailabilitySlots());
    dispatch(clearConsultation());
    setSelectedSlot(null);
    setCurrentSlotPulseKey(0);
    setConsultationAnswers({});

    dispatch(getServicesAction())
      .unwrap()
      .then(() => {
        if (!editingAppointment) {
          return;
        }

        const appointmentDate = parseAppointmentDateTime(
          editingAppointment.startAt,
        );
        const appointmentSlot = getAppointmentSlot(editingAppointment);

        if (!appointmentDate || !appointmentSlot) {
          messageApi.error('Unable to load appointment details for update');
          return;
        }

        form.setFieldsValue({
          serviceId: editingAppointment.serviceId,
          appointmentDate,
          appointmentTime: appointmentSlot,
        });
        setSelectedSlot(appointmentSlot);
        void loadAvailabilityFor(
          editingAppointment.serviceId,
          appointmentDate,
          appointmentSlot,
        );
      })
      .catch((error: unknown) => {
        if (isSessionIdleExpiredError(error)) {
          return;
        }

        messageApi.error(
          getGenericErrorMessage('Load appointment services', error),
        );
      });
  }, [
    authSession,
    dispatch,
    editingAppointment,
    form,
    loadAvailabilityFor,
    messageApi,
    open,
  ]);

  const loadAvailability = async () => {
    if (!authSession) {
      messageApi.error('Please log in to book an appointment');
      return;
    }

    const serviceId = form.getFieldValue('serviceId');
    const appointmentDate = form.getFieldValue('appointmentDate');

    if (!serviceId || !appointmentDate) {
      dispatch(clearAvailabilitySlots());
      setSelectedSlot(null);
      return;
    }

    if (!isEditMode && !matchedBarberId) {
      dispatch(clearAvailabilitySlots());
      setSelectedSlot(null);
      return;
    }

    setSelectedSlot(null);

    await loadAvailabilityFor(
      serviceId,
      appointmentDate,
      undefined,
      matchedBarberId,
    );
  };

  const startConsultationForService = async (serviceId: string) => {
    if (isEditMode) {
      return;
    }

    dispatch(clearConsultation());
    setConsultationAnswers({});

    try {
      await dispatch(startConsultationAction({ serviceId })).unwrap();
    } catch (error) {
      if (isSessionIdleExpiredError(error)) {
        return;
      }

      messageApi.error(getGenericErrorMessage('Start consultation', error));
    }
  };

  const handleConsultationAnswerChange = (
    questionId: string,
    answer: string,
  ) => {
    dispatch(clearConsultationResult());
    dispatch(clearAvailabilitySlots());
    form.setFieldValue('appointmentTime', undefined);
    setSelectedSlot(null);
    setConsultationAnswers((currentAnswers) => ({
      ...currentAnswers,
      [questionId]: answer,
    }));
  };

  const handleMatchBarber = async () => {
    if (!selectedServiceId || !currentConsultationStartResult) {
      return;
    }

    const answers = currentConsultationStartResult.questions.map(
      (question) => ({
        questionId: question.id,
        answer: consultationAnswers[question.id]?.trim() ?? '',
      }),
    );

    try {
      const result = await dispatch(
        submitConsultationAction({
          serviceId: selectedServiceId,
          answers,
        }),
      ).unwrap();

      const appointmentDate = form.getFieldValue('appointmentDate');

      if (appointmentDate) {
        await loadAvailabilityFor(
          selectedServiceId,
          appointmentDate,
          undefined,
          result.matchedBarber.id,
        );
      }
    } catch (error) {
      if (isSessionIdleExpiredError(error)) {
        return;
      }

      messageApi.error(getGenericErrorMessage('Match barber', error));
    }
  };

  const handleSubmit = async (values: AppointmentFormValues) => {
    if (
      !authSession ||
      !values.serviceId ||
      !values.appointmentDate ||
      !values.appointmentTime
    ) {
      messageApi.error('Please log in and complete the form');
      return;
    }

    try {
      if (editingAppointment) {
        await dispatch(
          updateAppointmentAction({
            appointmentId: editingAppointment.id,
            data: {
              date: values.appointmentDate.format('YYYY-MM-DD'),
              slot: values.appointmentTime,
            },
          }),
        ).unwrap();
        messageApi.success('Appointment updated successfully');
      } else {
        if (!currentConsultationResult) {
          messageApi.error('Please complete the consultation before booking');
          return;
        }

        await dispatch(
          createAppointmentAction({
            serviceId: values.serviceId,
            date: values.appointmentDate.format('YYYY-MM-DD'),
            slot: values.appointmentTime,
            staffId: currentConsultationResult.matchedBarber.id,
            consultationSummary: currentConsultationResult.consultationSummary,
            safetyNotes: getSafetyNotesText(currentConsultationResult),
            hairState: currentConsultationResult.hairState,
            desiredLook: currentConsultationResult.desiredLook ?? undefined,
          }),
        ).unwrap();
        messageApi.success('Appointment created successfully');
      }

      form.resetFields();
      dispatch(clearAvailabilitySlots());
      dispatch(clearConsultation());
      setSelectedSlot(null);
      setConsultationAnswers({});
      onBooked();
    } catch (error) {
      if (isSessionIdleExpiredError(error)) {
        return;
      }

      messageApi.error(
        getGenericErrorMessage(
          editingAppointment ? 'Update appointment' : 'Create appointment',
          error,
        ),
      );
    }
  };

  return (
    <>
      {contextHolder}
      <Modal
        title={
          <SAModalHeader
            title={isEditMode ? 'Update Appointment' : 'New Appointment'}
          />
        }
        open={open}
        onCancel={onClose}
        footer={null}
        centered
        zIndex={1300}
        width={660}
        styles={{
          body: {
            paddingTop: 16,
          },
        }}
      >
        <Spin spinning={servicesLoading}>
          <Form<AppointmentFormValues>
            layout="vertical"
            form={form}
            onFinish={handleSubmit}
            onValuesChange={(changedValues) => {
              if ('serviceId' in changedValues) {
                form.setFieldValue('appointmentDate', undefined);
                form.setFieldValue('appointmentTime', undefined);
                dispatch(clearAvailabilitySlots());
                setSelectedSlot(null);

                if (changedValues.serviceId) {
                  void startConsultationForService(changedValues.serviceId);
                } else {
                  dispatch(clearConsultation());
                  setConsultationAnswers({});
                }

                return;
              }

              if ('appointmentDate' in changedValues) {
                form.setFieldValue('appointmentTime', undefined);
                void loadAvailability();
              }
            }}
            autoComplete="off"
            className="appointment-form"
          >
            <Form.Item
              name="serviceId"
              label={<span className="appointment-form-label">Service</span>}
              rules={[
                {
                  required: true,
                  message: 'Please select a service',
                },
              ]}
            >
              <Select
                size="large"
                placeholder="Select a service"
                disabled={isEditMode}
                options={services.map((service) => ({
                  value: service.id,
                  label: `${service.name} - ${service.durationMinutes} mins`,
                }))}
              />
            </Form.Item>

            {!isEditMode && selectedServiceId ? (
              <div className="appointment-consultation-panel">
                <div className="appointment-consultation-header">
                  <span className="appointment-consultation-eyebrow">
                    AI barber match
                  </span>
                  <strong>Tell us what you need before choosing a time.</strong>
                </div>

                {consultationLoadingStart ? (
                  <Spin />
                ) : consultationError && !currentConsultationStartResult ? (
                  <Alert
                    type="error"
                    showIcon
                    message="Consultation could not be started."
                  />
                ) : currentConsultationStartResult &&
                  !currentConsultationResult ? (
                  <div className="appointment-consultation-questions">
                    {currentConsultationStartResult.previousHairHistory.length >
                    0 ? (
                      <Alert
                        type="info"
                        showIcon
                        message={`${currentConsultationStartResult.previousHairHistory.length} previous hair record(s) will be considered for this match.`}
                      />
                    ) : null}

                    {currentConsultationStartResult.questions.map(
                      (question) => (
                        <label
                          key={question.id}
                          className="appointment-consultation-question"
                        >
                          <span>
                            {question.label}
                            {question.required ? (
                              <span className="appointment-consultation-required">
                                *
                              </span>
                            ) : null}
                          </span>
                          {question.helperText ? (
                            <small>{question.helperText}</small>
                          ) : null}
                          <Input.TextArea
                            value={consultationAnswers[question.id] ?? ''}
                            onChange={(event) =>
                              handleConsultationAnswerChange(
                                question.id,
                                event.target.value,
                              )
                            }
                            rows={2}
                            maxLength={1000}
                            showCount
                            placeholder="Add your answer"
                          />
                        </label>
                      ),
                    )}

                    <Button
                      type="primary"
                      loading={consultationSubmitting}
                      disabled={!areConsultationAnswersComplete}
                      onClick={handleMatchBarber}
                    >
                      Match Barber
                    </Button>
                  </div>
                ) : currentConsultationResult ? (
                  <div className="appointment-consultation-result">
                    <div>
                      <span className="appointment-consultation-eyebrow">
                        Recommended barber
                      </span>
                      <strong>
                        {currentConsultationResult.matchedBarber.displayName}
                      </strong>
                      <span>
                        Match score: {currentConsultationResult.matchScore}%
                      </span>
                    </div>

                    <ul>
                      {currentConsultationResult.matchReasons.map((reason) => (
                        <li key={reason}>{reason}</li>
                      ))}
                    </ul>

                    {currentConsultationResult.safetyNotes.length > 0 ? (
                      <Alert
                        type="warning"
                        showIcon
                        message="Safety notes will be shared with the barber."
                        description={currentConsultationResult.safetyNotes
                          .map((note) => note.message)
                          .join(' ')}
                      />
                    ) : null}
                  </div>
                ) : null}
              </div>
            ) : null}

            <Form.Item
              name="appointmentDate"
              label={
                <span className="appointment-form-label">Appointment Date</span>
              }
              rules={[
                {
                  required: true,
                  message: 'Please select an appointment date',
                },
              ]}
            >
              <DatePicker
                size="large"
                cellRender={(current, info) => {
                  const currentDate = dayjs.isDayjs(current) ? current : null;

                  if (
                    info.type !== 'date' ||
                    !currentDate ||
                    !currentAppointmentDateKey ||
                    currentDate.format('YYYY-MM-DD') !==
                      currentAppointmentDateKey
                  ) {
                    return info.originNode;
                  }

                  return (
                    <div className="appointment-original-date-cell">
                      {info.originNode}
                      <span className="appointment-original-date-marker">
                        Original
                      </span>
                    </div>
                  );
                }}
                className="appointment-date-picker"
                disabled={!selectedServiceId || !isConsultationReady}
                disabledDate={(current) => {
                  if (!current) {
                    return false;
                  }

                  if (
                    isEditMode &&
                    currentAppointmentDateKey &&
                    current.format('YYYY-MM-DD') === currentAppointmentDateKey
                  ) {
                    return false;
                  }

                  const day = current.day();
                  const today = new Date();
                  const startOfToday = new Date(
                    today.getFullYear(),
                    today.getMonth(),
                    today.getDate(),
                  );

                  return (
                    day === 0 || day === 6 || current.toDate() < startOfToday
                  );
                }}
              />
            </Form.Item>

            <Form.Item
              name="appointmentTime"
              label={
                <span className="appointment-form-label">
                  Available Time Slots
                </span>
              }
              rules={[
                {
                  required: true,
                  message: 'Please select a time slot',
                },
              ]}
            >
              {slotsLoading ? (
                <Spin />
              ) : showNoAvailabilityMessage ? (
                <div className="appointment-slot-unavailable">
                  No appointments available for the selected service and date.
                </div>
              ) : (
                <div className="appointment-slot-section">
                  {shouldShowCurrentAppointmentSlot ? (
                    <button
                      type="button"
                      className={[
                        'appointment-current-slot-card',
                        selectedSlot === currentAppointmentSlot
                          ? 'appointment-current-slot-card-selected'
                          : '',
                      ]
                        .filter(Boolean)
                        .join(' ')}
                      aria-pressed={selectedSlot === currentAppointmentSlot}
                      onClick={() => {
                        setSelectedSlot(currentAppointmentSlot);
                        setCurrentSlotPulseKey((currentKey) => currentKey + 1);
                        form.setFieldValue(
                          'appointmentTime',
                          currentAppointmentSlot,
                        );
                      }}
                    >
                      <span className="appointment-current-slot-kicker">
                        Current appointment
                      </span>
                      <span className="appointment-current-slot-time">
                        {formatAppointmentSlot(currentAppointmentSlot)}
                      </span>
                      <span className="appointment-current-slot-service">
                        {currentAppointmentServiceName}
                      </span>
                      <span className="appointment-current-slot-badge">
                        {selectedSlot === currentAppointmentSlot
                          ? 'Selected'
                          : 'Current'}
                      </span>
                      {currentSlotPulseKey > 0 ? (
                        <span
                          key={currentSlotPulseKey}
                          className="appointment-current-slot-pulse"
                        />
                      ) : null}
                    </button>
                  ) : null}

                  {showNoAlternativeSlotsMessage ? (
                    <div className="appointment-slot-empty">
                      No other time slots are available for this appointment.
                    </div>
                  ) : (
                    <div className="appointment-slot-grid">
                      {availableSlots.map((slot) => (
                        <Button
                          key={slot}
                          type={selectedSlot === slot ? 'primary' : 'default'}
                          size="large"
                          className="appointment-slot-button"
                          onClick={() => {
                            setSelectedSlot(slot);
                            form.setFieldValue('appointmentTime', slot);
                          }}
                        >
                          {formatAppointmentSlot(slot)}
                        </Button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </Form.Item>

            <Form.Item className="appointment-form-actions-item">
              <div className="appointment-form-actions">
                <Button size="large" onClick={onClose}>
                  Cancel
                </Button>
                <Button
                  type="primary"
                  htmlType="submit"
                  loading={confirmLoading}
                  disabled={
                    !selectedSlot ||
                    !hasAppointmentChange ||
                    (!isEditMode && !currentConsultationResult)
                  }
                  size="large"
                >
                  {isEditMode ? 'Update Appointment' : 'Book Appointment'}
                </Button>
              </div>
            </Form.Item>
          </Form>
        </Spin>
      </Modal>
    </>
  );
}
