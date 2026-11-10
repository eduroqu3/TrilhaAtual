import factory
from django.contrib.auth import get_user_model

from apps.accounts.models import RoleChoices

Usuario = get_user_model()


class UsuarioFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = Usuario
        django_get_or_create = ("username",)

    username = factory.Sequence(lambda n: f"user{n}")
    email = factory.LazyAttribute(lambda o: f"{o.username}@example.com")
    first_name = "Teste"
    last_name = "Usuario"
    role = RoleChoices.ALUNO
    is_active = True

    # Gera escola por padrão para perfis não-admin
    escola = factory.Maybe(
        factory.LazyAttribute(lambda o: o.role == RoleChoices.ADMIN),
        yes_declaration=None,
        no_declaration=factory.SubFactory("apps.escolas.factories.EscolaFactory"),
    )

    @classmethod
    def _create(cls, model_class, *args, **kwargs):
        password = kwargs.pop("password", "senha_segura123")
        user = super()._create(model_class, *args, **kwargs)
        user.set_password(password)
        user.save()
        return user
